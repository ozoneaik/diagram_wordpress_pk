import React, { useState } from "react";
import axios from "axios";
import {
    Box, Card, CardContent, Typography, TextField, Button, Select,
    MenuItem, FormControl, InputLabel, CircularProgress, Table, TableBody,
    TableCell, TableHead, TableRow, Dialog, DialogContent, Grid, useMediaQuery, useTheme,
} from "@mui/material";
import { Search } from "@mui/icons-material";


axios.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";
const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
if (token) {
    axios.defaults.headers.common["X-CSRF-TOKEN"] = token;
}
const DiagramSearch = () => {
    const [productOrModel, setProductOrModel] = useState("");
    const [serialNumber, setSerialNumber] = useState("");
    const [dmTypes, setDmTypes] = useState([]);
    const [selectedDmType, setSelectedDmType] = useState("");
    const [currentData, setCurrentData] = useState(null);
    const [images, setImages] = useState([]);
    const [partsList, setPartsList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogImage, setDialogImage] = useState("");

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    const handleSearch = async () => {
        if (!productOrModel && !serialNumber) {
            alert("กรุณากรอกรหัสสินค้า หรือ รหัสโมเดลสินค้า");
            return;
        }

        setLoading(true);
        setPartsList([]);
        setImages([]);
        try {
            const response = await axios.get(route("search-diagram"), {
                params: {
                    pid: productOrModel || null,
                    sn: serialNumber || null,
                    views: "single",
                },
                withCredentials: true, // ส่ง cookie ถ้าต้องการ session
            });

            const result = response.data;

            if (result && result.length > 0) {
                setCurrentData(result);

                const types = result.map((item) => ({
                    typedm: item.typedm,
                    modelfg: item.modelfg,
                }));
                setDmTypes(types);
                console.log(types);
                console.log(result);
                setSelectedDmType(types[0].typedm);

                renderDiagramByType(types[0].typedm, result);
            } else {
                setPartsList([]);
                alert("ไม่พบข้อมูลที่ต้องการค้นหา");
            }
        } catch (error) {
            console.error("Search error:", error);
            alert("เกิดข้อผิดพลาดในการค้นหา");
        } finally {
            setLoading(false);
        }
    };

    const renderDiagramByType = (dmType, data) => {
        const selectedDiagram = data.find((item) => item.typedm === dmType);

        if (selectedDiagram) {
            setImages(selectedDiagram.image?.map((img) => img.path_file) || []);
            setPartsList(selectedDiagram.list || []);
        } else {
            setImages([]);
            setPartsList([]);
        }
    };

    const handleDmTypeChange = (e) => {
        const selectedType = e.target.value;
        setSelectedDmType(selectedType);
        if (selectedType && currentData) {
            renderDiagramByType(selectedType, currentData);
        }
    };

    return (
        <Box>
            {/* Search Container */}
            <Card sx={{mb: 3, borderRadius: 3, boxShadow: 1 }}>
                <CardContent>
                    <Typography variant="h6" mb={2}>
                        ค้นหาไดอะแกรมสินค้า
                    </Typography>

                    <TextField
                        label="รหัสสินค้า / โมเดล"
                        fullWidth
                        value={productOrModel}
                        onChange={(e) => setProductOrModel(e.target.value)}
                        sx={{ mb: 2 }}
                        size="small"
                    />

                    <TextField
                        label="ซีเรียลนัมเบอร์สินค้า"
                        fullWidth
                        value={serialNumber}
                        onChange={(e) => setSerialNumber(e.target.value)}
                        sx={{ mb: 2 }}
                        size="small"
                    />

                    {dmTypes.length > 1 && (
                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>เลือกประเภทไดอะแกรม</InputLabel>
                            <Select value={selectedDmType} onChange={handleDmTypeChange} size="small">
                                {dmTypes.map((type) => (
                                    <MenuItem key={type.typedm} value={type.typedm}>
                                        {type.modelfg}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}

                    <Button
                        loading={loading} variant="contained"
                        color="warning" onClick={handleSearch}
                        fullWidth startIcon={<Search />}
                        sx={{ mb: 2 }}
                    >
                        ค้นหา
                    </Button>

                    <Box display="flex" gap={2} justifyContent="center" flexWrap="wrap">
                        <Button variant="outlined" color="warning">
                            📋 ดาวน์โหลดไดอะแกรม
                        </Button>
                        <Button variant="outlined" color="warning">
                            📄 ดาวน์โหลดคู่มือใช้งาน
                        </Button>
                    </Box>
                </CardContent>
            </Card>

            {/* Content Row */}
            <Grid container spacing={2}>
                {/* Image Preview */}
                <Grid size={{ xs: 12, md: 5 }}>
                    <Card sx={{ p: 2, borderRadius: 3, minHeight: 300 }}>
                        {loading && <CircularProgress />}
                        {images.length === 0 && !loading ? (
                            <Box textAlign="center" mt={5}>
                                <Typography variant="h3">🖼️</Typography>
                                <Typography color="textSecondary">
                                    ไดอะแกรมจะแสดงที่นี่
                                </Typography>
                            </Box>
                        ) : (
                            images.map((image, index) => (
                                <Box
                                    key={index}
                                    mb={2}
                                    onClick={() => {
                                        setDialogImage(image);
                                        setDialogOpen(true);
                                    }}
                                    sx={{ cursor: "pointer" }}
                                >
                                    <img
                                        src={image}
                                        alt={`ไดอะแกรม ${index + 1}`}
                                        style={{
                                            width: "100%",
                                            borderRadius: 8,
                                            maxHeight: isMobile ? 250 : 400,
                                            objectFit: "contain",
                                        }}
                                    />
                                </Box>
                            ))
                        )}
                    </Card>
                </Grid>

                {/* Parts Table */}
                <Grid size={{ xs: 12, md: 7 }}>
                    <Card sx={{ p: 2, borderRadius: 3, minHeight: 300 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>ตำแหน่ง</TableCell>
                                    <TableCell>รูป</TableCell>
                                    <TableCell>รหัส</TableCell>
                                    <TableCell>ชื่อ</TableCell>
                                    <TableCell>จำนวน</TableCell>
                                    <TableCell>ราคา</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {partsList.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center">
                                            ไม่พบข้อมูลอะไหล่
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    partsList.map((item, index) => {
                                        const imageUrl = `https://images.pumpkin.tools/SKUS/SP/offn/${item.skusp}.jpg`;
                                        return (
                                            <TableRow
                                                key={index}
                                                hover
                                                sx={{ cursor: "pointer" }}
                                                onClick={() => {
                                                    setDialogImage(imageUrl);
                                                    setDialogOpen(true);
                                                }}
                                            >
                                                <TableCell align="center">
                                                    {item.tracking_number}
                                                </TableCell>
                                                <TableCell>
                                                    <img
                                                        src={imageUrl}
                                                        alt="ไม่มีรูป"
                                                        style={{
                                                            width: 50,
                                                            height: 50,
                                                            objectFit: "contain",
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>{item.skusp}</TableCell>
                                                <TableCell>{item.skuspname}</TableCell>
                                                <TableCell>{`1 ${item.spunit || "ชิ้น"}`}</TableCell>
                                                <TableCell>
                                                    {item.price
                                                        ? parseFloat(item.price).toFixed(2)
                                                        : "-"}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </Grid>
            </Grid>

            {/* Dialog for Image */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogContent sx={{ textAlign: "center", p: 2 }}>
                    <img
                        src={dialogImage}
                        alt="preview"
                        style={{
                            width: "100%",
                            maxHeight: isMobile ? "60vh" : "80vh",
                            objectFit: "contain",
                        }}
                    />
                </DialogContent>
            </Dialog>
        </Box>
    );
};

export default DiagramSearch;
