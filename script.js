// Importa las funciones necesarias de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getFirestore, collection, doc, addDoc, getDocs, updateDoc, deleteDoc, query, where, onSnapshot, setDoc, orderBy } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// Tu configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyA4cU7nenQErslW0z-6vbiqc5_zJZZzIJg", // ¡Recuerda configurar las reglas de seguridad en Firebase!
    authDomain: "control-horario-46f5e.firebaseapp.com",
    projectId: "control-horario-46f5e",
    storageBucket: "control-horario-46f5e.firebasestorage.app",
    messagingSenderId: "782608962787", // 167422191795",
    appId: "1:782608962787:web:4a4214416b93b55854a1d6"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let usuariosCache = []; // Para evitar recargas innecesarias
let registrosCache = []; // Para evitar recargas innecesarias
let usuarioSeleccionadoId = null;

async function agregarUsuario() {
    const nombre = prompt("Introduce el nombre del usuario:");
    if (!nombre) return;

    try {
        const usuariosCollection = collection(db, 'users');
        const q = query(usuariosCollection, where("name", "==", nombre));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            const newUserDocRef = doc(usuariosCollection); // Crear un nuevo documento con ID automático
            await setDoc(newUserDocRef, { name: nombre });
            alert("Usuario añadido correctamente.");
        } else {
            alert("El usuario ya existe.");
        }
    } catch (error) {
        console.error("Error al añadir usuario:", error);
        alert("Error al añadir usuario. Consulta la consola.");
    }
}

async function editarUsuario(usuarioAntiguo) {
    const nuevoNombre = prompt("Introduce el nuevo nombre del usuario:", usuarioAntiguo);
    if (!nuevoNombre || nuevoNombre === usuarioAntiguo) return;

    try {
        const usuariosCollection = collection(db, 'users');
        const q = query(usuariosCollection, where("name", "==", usuarioAntiguo));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            querySnapshot.forEach(async (doc) => {
                await updateDoc(doc.ref, { name: nuevoNombre });
                alert("Usuario editado correctamente.");
            });
        } else {
            alert("No se encontró el usuario a editar.");
        }
    } catch (error) {
        console.error("Error al editar usuario:", error);
        alert("Error al editar usuario. Consulta la consola.");
    }
}

async function eliminarUsuario(usuario) {
    if (confirm(`¿Eliminar usuario ${usuario}?`)) {
        try {
            const usuariosCollection = collection(db, 'users');
            const q = query(usuariosCollection, where("name", "==", usuario));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                querySnapshot.forEach(async (doc) => {
                    // Eliminar registros asociados al usuario
                    const registrosCollection = collection(db, 'records');
                    const recordsQuery = query(registrosCollection, where("userName", "==", usuario));
                    const recordsSnapshot = await getDocs(recordsQuery);
                    recordsSnapshot.forEach(async (recordDoc) => {
                        await deleteDoc(recordDoc.ref);
                    });
                    await deleteDoc(doc.ref);
                    alert("Usuario eliminado correctamente.");
                });
            } else {
                alert("No se encontró el usuario a eliminar.");
            }
        } catch (error) {
            console.error("Error al eliminar usuario:", error);
            alert("Error al eliminar usuario. Consulta la consola.");
        }
    }
}

function actualizarUsuarios() {
    const usuariosCollection = collection(db, 'users');
    onSnapshot(usuariosCollection, (snapshot) => {
        usuariosCache = [];
        snapshot.forEach((doc) => {
            usuariosCache.push({ id: doc.id, name: doc.data().name });
        });

        const select = document.getElementById("usuarioSelect");
        if (select) {
            select.innerHTML = '<option value="">Seleccionar Usuario</option>' + usuariosCache.map(user => `<option value="<span class="math-inline">\{user\.name\}"\></span>{user.name}</option>`).join('');
            usuarioSeleccionadoId = select.value;
            select.onchange = () => {
                usuarioSeleccionadoId = select.value;
                actualizarTabla();
            };
            actualizarTabla();
        }

        const usuariosLista = document.getElementById("usuariosLista");
        if (usuariosLista) {
            usuariosLista.innerHTML = usuariosCache.map(user => `
                <li class="list-group-item">
                    <span class="math-inline">\{user\.name\}
<button onclick\="editarUsuario\('</span>{user.name}')" class="btn btn-sm btn-outline-secondary">✏️</button>
                    <button onclick="eliminarUsuario('${user.name}')" class="btn btn-sm btn-outline-danger">❌</button>
                </li>
            `).join('');
        }
    });
}

async function fichar(tipo) {
    const usuarioSeleccionado = document.getElementById("usuarioSelect").value;
    if (!usuarioSeleccionado) {
        alert("Por favor, selecciona un usuario antes de fichar.");
        return;
    }

    try {
        const ahora = new Date();
        const fecha = ahora.toISOString().split("T")[0];
        const hora = ahora.toLocaleTimeString().slice(0, 5);

        const registrosCollection = collection(db, 'records');
        const q = query(registrosCollection, where("userName", "==", usuarioSeleccionado), where("date", "==", fecha));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            if (tipo === "entrada") {
                await addDoc(registrosCollection, { userName: usuarioSeleccionado, date: fecha, entrada: hora, salida: "" });
                alert("Registro de entrada guardado correctamente.");
            } else if (tipo === "salida") {
                alert("Necesitas registrar la entrada primero para registrar la salida.");
            }
        } else {
            const registroDoc = querySnapshot.docs[0];
            const registroData = registroDoc.data();
            if (tipo === "entrada") {
                if (!registroData.entrada) {
                    await updateDoc(registroDoc.ref, { entrada: hora });
                    alert("Registro de entrada guardado correctamente.");
                } else {
                    alert("Ya has registrado una entrada para hoy.");
                }
            } else if (tipo === "salida") {
                if (registroData.entrada && !registroData.salida) {
                    if (hora < registroData.entrada) {
                        alert("La hora de salida no puede ser anterior a la de entrada.");
                        return;
                    }
                    await updateDoc(registroDoc.ref, { salida: hora });
                    alert("Registro de salida guardado correctamente.");
                } else if (!registroData.entrada) {
                    alert("Necesitas registrar la entrada antes de la salida.");
                } else {
                    alert("Ya has registrado una salida para hoy.");
                }
            }
        }
    } catch (error) {
        console.error("Error al fichar:", error);
        alert("Error al fichar. Consulta la consola.");
    }
}

function generarFilaTabla(registro, index) {
    const horasTrabajadas = calcularHoras(registro.entrada, registro.salida);
    return `
        <tr>
            <td><input type="date" value="<span class="math-inline">\{registro\.date\}" onchange\="modificarRegistro\('</span>{registro.id}', 'date', this.value)"></td>
            <td><input type="time" value="<span class="math-inline">\{registro\.entrada\}" onchange\="modificarRegistro\('</span>{registro.id}', 'entrada', this.value)"></td>
            <td><input type="time" value="<span class="math-inline">\{registro\.salida\}" onchange\="modificarRegistro\('</span>{registro.id}', 'salida', this.value)"></td>
            <td><span class="math-inline">\{horasTrabajadas\.toFixed\(2\)\} h</td\>
<td\><button onclick\="eliminarRegistro\('</span>{registro.id}')">❌</button></td>
        </tr>
    `;
}

function actualizarTabla() {
    if (!usuarioSeleccionadoId) {
        document.getElementById("registroTabla").innerHTML = "";
        document.getElementById("totalHoras").textContent = "0.00 h";
        return;
    }

    const registrosCollection = collection(db, 'records');
    const q = query(registrosCollection, where("userName", "==", usuarioSeleccionadoId), orderBy("date", "desc"));

    onSnapshot(q, (snapshot) => {
        registrosCache = [];
        let totalHorasTrabajadas = 0;
        snapshot.forEach((doc) => {
            const data = doc.data();
            const horas = calcularHoras(data.entrada, data.salida);
            totalHorasTrabajadas += horas;
            registrosCache.push({ id: doc.id, ...data });
        });

        const tabla = document.getElementById("registroTabla");
        tabla.innerHTML = registrosCache.map((registro, index) => generarFilaTabla(registro, index)).join("");
        document.getElementById("totalHoras").textContent = `${totalHorasTrabajadas.toFixed(2)} h`;
        configurarCalendarios();
    });
}

function calcularHoras(entrada, salida) {
    if (!entrada || !salida) return 0;

    const [h1, m1] = entrada.split(":").map(Number);
    const [h2, m2] = salida.split(":").map(Number);

    let horas = h2 - h1;
    let minutos = m2 - m1;

    if (minutos < 0) {
        minutos += 60;
        horas -= 1;
    }

    if (horas < 0) {
        horas += 24;
    }

    return horas + minutos / 60;
}

async function modificarRegistro(recordId, campo, valor) {
    try {
        const registroDocRef = doc(db, 'records', recordId);
        await updateDoc(registroDocRef, { [campo]: valor });
        alert("Registro modificado correctamente.");
        actualizarTabla(); // Recargar la tabla para reflejar los cambios
    } catch (error) {
        console.error("Error al modificar registro:", error);
        alert("Error al modificar registro. Consulta la consola.");
    }
}

async function eliminarRegistro(recordId) {
    try {
        await deleteDoc(doc(db, 'records', recordId));
        alert("Registro eliminado correctamente.");
        actualizarTabla(); // Recargar la tabla para reflejar los cambios
    } catch (error) {
        console.error("Error al eliminar registro:", error);
        alert("Error al eliminar registro. Consulta la consola.");
    }
}

async function exportarPDF() {
    if (!usuarioSeleccionadoId) {
        alert("Selecciona un usuario para exportar.");
        return;
    }

    try {
        const registrosExportar = registrosCache.filter(r => r.userName === usuarioSeleccionadoId);
        const userName = usuarioSeleccionadoId;
        let registrosFiltrados = registrosExportar;

        const tipoExportacion = document.getElementById("tipoExportacion").value;
        if (tipoExportacion === "mes") {
            registrosFiltrados = agruparRegistrosPorMes(registrosFiltrados);
        } else if (tipoExportacion === "anio") {
            registrosFiltrados = agruparRegistrosPorAnio(registrosFiltrados);
        } else if (tipoExportacion === "personalizado") {
            const fechaInicio = document.getElementById("fechaInicio").value;
            const fechaFin = document.getElementById("fechaFin").value;
            registrosFiltrados = filtrarRegistrosPorFecha(registrosFiltrados, fechaInicio, fechaFin);
        }

        const doc = new jspdf.jsPDF();
        let y = 10;
        if (tipoExportacion === "mes" || tipoExportacion === "anio") {
            Object.keys(registrosFiltrados).forEach(periodo => {
                doc.text(`Registros de Horario - ${userName} - ${periodo}`, 10, y);
                y += 10;
                registrosFiltrados[periodo].forEach(r => {
                    const horasTrabajadas = calcularHoras(r.entrada, r.salida).toFixed(2);
                    doc.text(`${r.date}: Entrada ${r.entrada || '-'} - Salida <span class="math-inline">\{r\.salida \|\| '\-'\} \(</span>{horasTrabajadas} h)`, 10, y);
                    y += 5;
                });
                y += 10;
            });
        } else {
            doc.text(`Registros de Horario - ${userName}`, 10, y);
            y += 10;
            registrosFiltrados.forEach(r => {
                const horasTrabajadas = calcularHoras(r.entrada, r.salida).toFixed(2);
                doc.text(`${r.date}: Entrada ${r.entrada || '-'} - Salida <span class="math-inline">\{r\.salida \|\| '\-'\} \(</span>{horasTrabajadas} h)`, 10, y);
                y += 5;
            });
        }

        doc.save(`control_horario_${userName}.pdf`);

    } catch (error) {
        console.error("Error al exportar a PDF:", error);
        alert("Error al exportar a PDF. Consulta la consola.");
    }
}

function agruparRegistrosPorMes(registros) {
    return registros.