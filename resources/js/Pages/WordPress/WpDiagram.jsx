import { Button } from "react-bootstrap";
import Swal from "sweetalert2";


export default function WpDiagram() {

    const handleAlert = () => {
        Swal.fire({
            title: 'Error!',
            text: 'Do you want to continue',
            icon: 'error',
            confirmButtonText: 'Cool'
        });
    }
    return (
        <>
            <Button onClick={handleAlert} variant="primary">
                Primary
            </Button>
        </>
    )
}