'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import DefaultLayout from '@/components/Layouts/DefaultLayout';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { initializeApp } from 'firebase/app';
import { useRouter } from 'next/navigation';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import Calendar from '@/components/Calendar';
import moment from 'moment';

// Firebase Configuración
const firebaseConfig = {
    apiKey: "AIzaSyCNCf1h7O3L2gN8zNY7NCn-4EL8d_RRqK0",
    authDomain: "stock-logic-d50bd.firebaseapp.com",
    databaseURL: "https://stock-logic-d50bd-default-rtdb.firebaseio.com",
    projectId: "stock-logic-d50bd",
    storageBucket: "stock-logic-d50bd.firebasestorage.app",
    messagingSenderId: "707692778699",
    appId: "1:707692778699:web:e55bd8d34febde56e0374e",
    measurementId: "G-YVW6TM9242"
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

const AppointmentsPage = () => {
    const [formData, setFormData] = useState({
        patientName: '',
        patientPhoneNumber: '',
        patientWhatsAppNumber: '',
        patientMotive: '',
        patientIsInsurante: false,
        insuranceMake: '',
        identification: '',
        insuranceImage: '',
        address: '',
        dateAppointment: '',
        dateTimeAppointment: ''
    });

    const [availableDays, setAvailableDays] = useState<string[]>([]);
    const router = useRouter();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [availableDayJSON, setAvailableDayJSON] = useState<any>([]);
    const [listHours, setListHours] = useState<any>([]);
    const [popupVisible, setPopupVisible] = useState(false);

    // Cargar los días habilitados desde el servicio
    useEffect(() => {
        const fetchAvailableDays = async () => {
            try {
                const response = await axios.get('https://api-jennifer-wkeor.ondigitalocean.app/api/available-work-days/list');
                if (response.data.ok) {
                    const days = response.data.availableWorkDays.map((day: any) => day.dayOfWeek);
                    setAvailableDays(days);
                    setAvailableDayJSON(response.data.availableWorkDays);

                }
            } catch (err) {
                console.error('Error fetching available work days:', err);
            }
        };
        fetchAvailableDays();
    }, []);

    const handleChange = (e: any) => {
        const { name, value } = e.target;

        // Verificar si el campo es de teléfono o WhatsApp
        if (name === "patientPhoneNumber" || name === "patientWhatsAppNumber") {
            // Eliminar cualquier carácter que no sea un número
            const sanitizedValue = value.replace(/[^0-9]/g, "");
            setFormData((prevFormData) => ({
                ...prevFormData,
                [name]: sanitizedValue,
            }));
        } else {
            setFormData((prevFormData) => ({
                ...prevFormData,
                [name]: value,
            }));
        }
    
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.checked,
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const storageRef = ref(storage, `insuranceImages/${file.name}`);

            uploadBytes(storageRef, file).then((snapshot) => {
                getDownloadURL(snapshot.ref).then((downloadURL) => {
                    setFormData({
                        ...formData,
                        insuranceImage: downloadURL,
                    });
                });
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await axios.post('https://api-jennifer-wkeor.ondigitalocean.app/api/appointments/create', formData);
            if (response.data.ok) {
                setPopupVisible(true); // Mostrar el popup de éxito
                setFormData({
                    patientName: '',
                    patientPhoneNumber: '',
                    patientWhatsAppNumber: '',
                    patientMotive: '',
                    patientIsInsurante: false,
                    insuranceMake: '',
                    identification: '',
                    insuranceImage: '',
                    address: '',
                    dateAppointment: '',
                    dateTimeAppointment: ''
                }); // Limpiar los campos del formulario
            }
        } catch (err) {
            setError('Error al registrar la cita. Inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const disableDates = (date: Date) => {
        // Obtener el día de la semana en español
        const dayOfWeek = date.toLocaleDateString('es-ES', { weekday: 'long' });

        // Deshabilitar los días que no están en la lista de días disponibles
        return !availableDays.includes(dayOfWeek);
    };

    const handleDateSelection = async (selectedDate: string | null) => {
        console.log(selectedDate);
        if (selectedDate) {
            setFormData((prevFormData) => ({
                ...prevFormData,
                dateAppointment: selectedDate
            }));
    
            console.log(`Fecha seleccionada: ${selectedDate}`);
    
            const dayInEnglish = moment(selectedDate).format("dddd");
            const daysTranslation: { [key: string]: string } = {
                Sunday: "Domingo",
                Monday: "Lunes",
                Tuesday: "Martes",
                Wednesday: "Miércoles",
                Thursday: "Jueves",
                Friday: "Viernes",
                Saturday: "Sábado",
            };
            const dayInSpanish = daysTranslation[dayInEnglish];
            console.log(`Día en español: ${dayInSpanish}`);
    
            const dayData = availableDayJSON.find((day: any) => day.dayOfWeek === dayInSpanish);
    
            if (!dayData) {
                console.log(`No hay horarios disponibles para ${dayInSpanish}`);
                return;
            }
    
            const timeRanges = dayData.workHours;
    
            try {
                const response = await axios.get("https://api-jennifer-wkeor.ondigitalocean.app/api/block-dates/list");
                const blockedDates = response.data.blockedDates;
                console.log(blockedDates);
    
                const blockedTimes = blockedDates.filter((block: any) => {
                    const blockDate = moment(block.dateBlock).local().add(1, 'd').format("YYYY-MM-DD");
                    const selectedDateFormatted = moment(selectedDate).local().format("YYYY-MM-DD");
                    console.log('block data -->', blockDate);
                    return blockDate === selectedDateFormatted;
                });
    
                const generateHoursArray = (start: string, end: string) => {
                    const startTime = moment(start, "HH:mm");
                    const endTime = moment(end, "HH:mm");
                    const hoursArray: string[] = [];
    
                    while (startTime.isBefore(endTime)) {
                        hoursArray.push(startTime.format("HH:mm"));
                        startTime.add(30, "minutes");
                    }
                    return hoursArray;
                };
    
                const availableHours = timeRanges.flatMap(({ startTime, endTime }: any) =>
                    generateHoursArray(startTime, endTime)
                )
                    .map((hour: any) => {
                        // Convertimos todas las horas al formato de 24 horas para la comparación
                        const hour24 = moment(hour, "HH:mm").format("HH:mm");
                        return hour24;
                    })
                    .filter((hour: any) => {
                        console.log("Evaluando hora:", hour);
                        for (const block of blockedTimes) {
                            if (block.blockAllDay) {
                                console.log(`Bloqueo total de todo el día para ${hour}`);
                                return false; // Bloquea todas las horas si blockAllDay es true
                            }
                
                            // Convertimos las horas bloqueadas a formato de 24 horas
                            const blockedStart = moment(block.startTime, "HH:mm").format("HH:mm");
                            const blockedEnd = moment(block.endTime, "HH:mm").format("HH:mm");
                
                            console.log(`Bloqueo de: ${blockedStart} a ${blockedEnd} para la hora ${hour}`);
                
                            // Convertimos la hora disponible a formato 24 horas para la comparación
                            const formattedHour = moment(hour, "HH:mm").format("HH:mm");
                
                            // Verificar si la hora está dentro del rango bloqueado
                            // La hora de inicio y la hora de fin se deben excluir también
                            if (moment(formattedHour, "HH:mm").isBetween(blockedStart, blockedEnd, null, '[)')) {
                                console.log(`Hora ${formattedHour} bloqueada dentro del rango.`);
                                return false; // Si la hora está en el rango bloqueado, no la agregamos
                            }
                
                            // Verificar si la hora es igual al inicio o al final del rango bloqueado
                            if (formattedHour === blockedStart || formattedHour === blockedEnd) {
                                console.log(`Hora ${formattedHour} bloqueada porque coincide con el inicio o fin.`);
                                return false; // Si la hora coincide con el inicio o fin, no la agregamos
                            }
                        }
                        return true; // Si no está bloqueada, se agrega la hora
                    });
                
                console.log(`Horas disponibles finales:`, availableHours);
                setListHours(availableHours);
                                             
    
    
            } catch (error) {
                console.error("Error al obtener las fechas bloqueadas:", error);
            }
        }
    };
    

    function convertTo12HourFormat(hour: string): string {
        const [hourPart, minutePart] = hour.split(":");
        const hourNumber = parseInt(hourPart, 10);

        // Convertir al formato de 12 horas
        const formattedHour = hourNumber % 12 || 12; // Ajustar 0 a 12 para medianoche
        const period = hourNumber >= 12 ? "PM" : "AM";

        return `${formattedHour}:${minutePart} ${period}`;
    }



    return (
<>
    <div className="max-w-full mx-4 sm:mx-auto sm:max-w-4xl">
        <h1 className="text-3xl font-semibold text-left mb-2">Registrar Cita</h1>
        <h4 className="text-lg font-normal text-left mb-8">Ingrese los datos solicitados para agendar la cita</h4>

        {error && <div className="text-red-600 text-center mb-4">{error}</div>}

        <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {/* Nombre del paciente */}
                <div>
                    <label className="block text-sm font-medium">Nombre del Paciente</label>
                    <input
                        type="text"
                        name="patientName"
                        value={formData.patientName}
                        onChange={handleChange}
                        required
                        className="w-full p-3 border rounded-md"
                    />
                </div>

                {/* Teléfono del paciente */}
                <div>
                    <label className="block text-sm font-medium">Teléfono del Paciente</label>
                    <input
                        type="text"
                        name="patientPhoneNumber"
                        value={formData.patientPhoneNumber}
                        onChange={handleChange}
                        required
                        className="w-full p-3 border rounded-md"
                    />
                </div>

                {/* WhatsApp del paciente */}
                <div>
                    <label className="block text-sm font-medium">WhatsApp del Paciente</label>
                    <input
                                type="text"
                                name="patientWhatsAppNumber"
                                value={formData.patientWhatsAppNumber}
                                onChange={handleChange}
                                required
                                className="w-full p-3 border rounded-md"
                                pattern="\d*" // Solo permite dígitos
                                title="Por favor, ingresa solo números"
                            />
                </div>

                {/* Motivo de la cita */}
                <div>
                    <label className="block text-sm font-medium">Motivo de la Cita</label>
                    <input
                        type="text"
                        name="patientMotive"
                        value={formData.patientMotive}
                        onChange={handleChange}
                        required
                        className="w-full p-3 border rounded-md"
                    />
                </div>
            </div>

            {/* Checkbox: ¿Está asegurado? */}
            <div className="mb-4">
                <label className="inline-flex items-center">
                    <input
                        type="checkbox"
                        name="patientIsInsurante"
                        checked={formData.patientIsInsurante}
                        onChange={handleCheckboxChange}
                        className="mr-2"
                    />
                    Usted es un paciente con seguro medico
                </label>
            </div>

            {/* Aseguradora (solo si está asegurado) */}
            {formData.patientIsInsurante && (
                <div className="mb-4">
                    <label className="block text-sm font-medium">Compañía Aseguradora</label>
                    <select
                        name="insuranceMake"
                        value={formData.insuranceMake}
                        onChange={handleChange}
                        className="w-full p-3 border rounded-md"
                        required
                    >
                        <option value="">Selecciona una aseguradora</option>
                        <option value="Senasa">Senasa</option>
                        <option value="Humano">Humano</option>
                        <option value="Palic MAPHRE">Palic MAPHRE</option>
                        <option value="Futuro ARS">Futuro ARS</option>
                        <option value="Universal">Universal</option>
                        <option value="Monumental">Monumental</option>
                        <option value="Banreservas">Banreservas</option>
                        <option value="Semma">Semma</option>
                        <option value="Renacer">Renacer</option>
                        <option value="UASD">UASD</option>
                        <option value="Asemap">Asemap</option>
                        <option value="APS">APS</option>
                        <option value="ARL Riesgos Laborales">ARL Riesgos Laborales</option>
                    </select>
                </div>
            )}

            {/* Identificación (solo si está asegurado) */}
            {formData.patientIsInsurante && (
                <div className="mb-4">
                    <label className="block text-sm font-medium">Identificación</label>
                    <input
                        type="text"
                        name="identification"
                        value={formData.identification}
                        onChange={handleChange}
                        required
                        className="w-full p-3 border rounded-md"
                    />
                </div>
            )}

            {/* Imagen del seguro */}
            {formData.patientIsInsurante && (
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-3">Imagen del Seguro</label>
                    <div
                        className="flex justify-center items-center p-6 border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:border-blue-500"
                        onClick={() => document.getElementById('insuranceImageInput')?.click()}
                    >
                        {!formData.insuranceImage ? (
                            <div className="text-center text-gray-500">
                                <p>Arrastra o haz clic para seleccionar una imagen</p>
                                <p className="mt-2 text-sm text-blue-500">Seleccionar archivo</p>
                            </div>
                        ) : (
                            <img src={formData.insuranceImage} alt="Imagen del seguro" className="w-full h-auto rounded-md" />
                        )}
                        <input
                            type="file"
                            name="insuranceImage"
                            id="insuranceImageInput"
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                        />
                    </div>
                </div>
            )}

            {/* Dirección */}
            <div className="mb-4">
                <label className="block text-sm font-medium">Dirección</label>
                <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    required
                    className="w-full p-3 border rounded-md"
                />
            </div>

            {/* Fecha y hora de la cita */}
            <Calendar allowedDays={availableDays} onDateSelect={handleDateSelection} />
            <div className="mb-4 mt-4">
                <label className="block text-sm font-medium">Hora de la cita</label>
                <select
                    className="block w-full mt-1 border rounded-md shadow-sm focus:ring focus:ring-opacity-50 p-3"
                    disabled={listHours.length === 0} // Desactiva el select si no hay horas disponibles
                    onChange={(e) =>
                        setFormData((prevFormData) => ({
                          ...prevFormData,
                          dateTimeAppointment: e.target.value, // Actualiza la hora seleccionada
                        }))
                    }
                    required
                >
                    <option value="" disabled selected>
                        {listHours.length > 0 ? "Seleccione una hora" : "No hay horarios disponibles"}
                    </option>
                    {listHours.map((hour: any) => (
                        <option key={hour} value={convertTo12HourFormat(hour)}>
                            {convertTo12HourFormat(hour)}
                        </option>
                    ))}
                </select>
            </div>

            {/* Botón de enviar */}
            <div className="text-center">
                <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-500"
                >
                    {loading ? 'Registrando...' : 'Registrar Cita'}
                </button>
            </div>
        </form>
    </div>

    {popupVisible && (
                <div className="fixed inset-0 flex items-center justify-center bg-gray-600 bg-opacity-50">
                    <div className="bg-white p-6 rounded-md shadow-md w-96">
                        <h3 className="text-xl font-semibold text-center">¡Cita Agendada!</h3>
                        <p className="text-center mt-2">La cita ha sido registrada correctamente.</p>
                        <div className="flex justify-center mt-4">
                            <button
                                onClick={() => setPopupVisible(false)}
                                className="bg-blue-500 text-white px-6 py-2 rounded-md"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
</>

    );
};

export default AppointmentsPage;
