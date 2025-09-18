<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;

class DiagramController extends Controller
{
    // แสดงหน้า Diagram Search
    public function index()
    {
        return Inertia::render('WordPress/WpDiagram');
    }

    // API สำหรับค้นหา Diagram
    public function search(Request $request): JsonResponse
    {
        try {
            $sn = $request->input('sn');
            $pid = $request->input('pid');
            $views = $request->input('views', 'single');

            if ($sn) {
                // ค้นหาโดยใช้ Serial Number
                return $this->searchBySerialNumber($sn, $views);
            } elseif ($pid) {
                // ค้นหาโดยใช้ Product ID
                return $this->searchByProductId($pid);
            } else {
                return response()->json([
                    'error' => 'ไม่พบ sn หรือ pid'
                ], 400);
            }
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'เกิดข้อผิดพลาดในการค้นหา: ' . $e->getMessage()
            ], 500);
        }
    }

    private function searchBySerialNumber(string $sn, string $views): JsonResponse
    {
        try {
            // เรียก API สำหรับค้นหา Serial Number
            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
                'Authorization' => 'Basic Og=='
            ])->post('https://slip.pumpkin.tools/serial/R_mainserial.php', [
                'sn' => $sn,
                'views' => $views
            ]);

            if ($response->failed()) {
                return response()->json([
                    'error' => 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้'
                ], 500);
            }

            $data = $response->json();
            $skucode = $data['skucode'] ?? null;

            if (!$skucode) {
                return response()->json([
                    'error' => 'ไม่พบข้อมูลสำหรับ Serial Number นี้'
                ], 404);
            }

            return $this->getData($skucode);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'เกิดข้อผิดพลาดในการค้นหาด้วย Serial Number: ' . $e->getMessage()
            ], 500);
        }
    }

    private function searchByProductId(string $pid): JsonResponse
    {
        return $this->getData($pid);
    }

    private function getData(string $pid): JsonResponse
    {
        try {
            // เชื่อมต่อฐานข้อมูล diagram
            $connection = DB::connection('diagram');

            // ดึงข้อมูลจาก API
            $productData = $this->getDataFromApi($pid);

            // ค้นหาประเภท diagram
            $diagramTypes = $connection
                ->table('data_file')
                ->select('typedm', 'modelfg')
                ->where('skufg', 'LIKE', "%{$pid}%")
                ->groupBy('typedm', 'modelfg')
                ->get();

            if ($diagramTypes->isEmpty()) {
                return response()->json([
                    'message' => 'ไม่พบข้อมูลสำหรับรหัสสินค้านี้'
                ], 404);
            }

            $result = [];

            foreach ($diagramTypes as $type) {
                // ดึงรายการอะไหล่สำหรับแต่ละประเภท
                $partsList = $connection
                    ->table('data_file')
                    ->where('skufg', 'LIKE', "%{$pid}%")
                    ->where('typedm', 'LIKE', "%{$type->typedm}%")
                    ->orderByRaw('tracking_number*1 ASC')
                    ->get();

                // สร้าง lookup table สำหรับราคาและหน่วย
                $priceMap = [];
                $unitMap = [];

                foreach ($productData as $product) {
                    $priceMap[$product['spcode']] = $product['stdprice_per_unit'];
                    $unitMap[$product['spcode']] = $product['spunit'] ?? 'ชิ้น';
                }

                // เพิ่มราคาและหน่วยเข้าไปในรายการอะไหล่
                $partsListWithPrice = $partsList->map(function ($item) use ($priceMap, $unitMap) {
                    $item = (array) $item;
                    $skusp = $item['skusp'];

                    if (isset($priceMap[$skusp])) {
                        $item['price'] = $priceMap[$skusp];
                    }

                    if (isset($unitMap[$skusp])) {
                        $item['spunit'] = $unitMap[$skusp];
                    }

                    return $item;
                });

                // ดึงรายการรูปภาพ
                $images = $this->getImageList($pid, $type->typedm);

                $result[] = [
                    'typedm' => $type->typedm,
                    'modelfg' => $type->modelfg,
                    'image' => $images,
                    'list' => $partsListWithPrice,
                    'get_data_product' => $productData
                ];
            }

            // เพิ่มข้อมูลเพิ่มเติมในตัวแรก
            if (!empty($result)) {
                $result[0]['test_message'] = 'https://slip.pumpkin.tools/serial/R_mainproduct.php';
            }

            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'เกิดข้อผิดพลาดในการดึงข้อมูล: ' . $e->getMessage()
            ], 500);
        }
    }

    private function getImageList(string $pid, string $typeDm): array
    {
        try {
            $connection = DB::connection('diagram');

            $images = $connection
                ->table('diagram_list')
                ->select('path_file')
                ->where('sku_code', 'LIKE', "%{$pid}%")
                ->where('dm_type', 'LIKE', "%{$typeDm}%")
                ->get();

            return $images->toArray();
        } catch (\Exception $e) {
            return [];
        }
    }

    private function getDataFromApi(string $pid): array
    {
        try {
            $response = Http::post('https://slip.pumpkin.tools/serial/R_mainproduct.php', [
                'pid' => $pid,
                'views' => 'single'
            ]);

            if ($response->failed()) {
                return [];
            }

            $data = $response->json();
            return $data['assets'][0]['sp'] ?? [];
        } catch (\Exception $e) {
            return [];
        }
    }
}
