// Estructura para almacenar los pedidos
let pedidos = [];
let map;
let markers = [];
let directionsService;
let directionsRenderers = [];

// Inicializar el mapa
function initMap() {
    // Centrado en una ubicación por defecto (ajusta según tu ciudad)
    const centro = { lat: 4.5, lng: -75.75 };
    
    map = new google.maps.Map(document.getElementById('map'), {
        center: centro,
        zoom: 13
    });

    directionsService = new google.maps.DirectionsService();
    
    // Cargar pedidos guardados
    cargarPedidos();
}

// Función para guardar pedidos
function guardarPedido(direccion, descripcion, domiciliario) {
    // Usar Geocoding para obtener las coordenadas de la dirección
    const geocoder = new google.maps.Geocoder();
    
    geocoder.geocode({ address: direccion }, (results, status) => {
        if (status === 'OK') {
            const pedido = {
                id: Date.now(),
                direccion: direccion,
                descripcion: descripcion,
                domiciliario: domiciliario,
                lat: results[0].geometry.location.lat(),
                lng: results[0].geometry.location.lng()
            };
            
            pedidos.push(pedido);
            localStorage.setItem('pedidos', JSON.stringify(pedidos));
            
            mostrarPedidos();
            optimizarRutas();
            añadirMarcador(pedido);
        } else {
            alert('No se pudo encontrar la dirección: ' + status);
        }
    });
}

// Función para cargar pedidos guardados
function cargarPedidos() {
    const pedidosGuardados = localStorage.getItem('pedidos');
    if (pedidosGuardados) {
        pedidos = JSON.parse(pedidosGuardados);
        mostrarPedidos();
        pedidos.forEach(pedido => añadirMarcador(pedido));
        optimizarRutas();
    }
}

// Función para mostrar los pedidos en la lista
function mostrarPedidos() {
    const listaPedidos = document.getElementById('listaPedidos');
    listaPedidos.innerHTML = '';
    
    pedidos.forEach(pedido => {
        const div = document.createElement('div');
        div.className = 'pedido-item';
        div.innerHTML = `
            <strong>Pedido:</strong> ${pedido.descripcion}<br>
            <strong>Dirección:</strong> ${pedido.direccion}<br>
            <strong>Domiciliario:</strong> ${pedido.domiciliario}
            <button onclick="eliminarPedido(${pedido.id})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        listaPedidos.appendChild(div);
    });
}

// Función para añadir marcadores al mapa
function añadirMarcador(pedido) {
    const marker = new google.maps.Marker({
        position: { lat: pedido.lat, lng: pedido.lng },
        map: map,
        title: pedido.descripcion
    });
    
    markers.push(marker);
}

// Función para limpiar marcadores
function limpiarMarcadores() {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
}

// Función para eliminar un pedido
function eliminarPedido(id) {
    pedidos = pedidos.filter(pedido => pedido.id !== id);
    localStorage.setItem('pedidos', JSON.stringify(pedidos));
    limpiarMarcadores();
    pedidos.forEach(pedido => añadirMarcador(pedido));
    mostrarPedidos();
    optimizarRutas();
}

// Función para optimizar rutas
function optimizarRutas() {
    // Limpiar rutas anteriores
    directionsRenderers.forEach(renderer => renderer.setMap(null));
    directionsRenderers = [];
    
    // Agrupar pedidos por domiciliario
    const pedidosPorDomiciliario = {};
    pedidos.forEach(pedido => {
        if (!pedidosPorDomiciliario[pedido.domiciliario]) {
            pedidosPorDomiciliario[pedido.domiciliario] = [];
        }
        pedidosPorDomiciliario[pedido.domiciliario].push(pedido);
    });

    // Calcular ruta para cada domiciliario
    Object.entries(pedidosPorDomiciliario).forEach(([domiciliario, pedidosDomiciliario]) => {
        if (pedidosDomiciliario.length > 0) {
            calcularRutaOptima(pedidosDomiciliario, domiciliario);
        }
    });
}

// Función para calcular la ruta óptima usando el algoritmo del vecino más cercano
function calcularRutaOptima(pedidosDomiciliario, domiciliario) {
    if (pedidosDomiciliario.length === 0) return;
    
    // Punto de inicio (se puede ajustar según tu necesidad)
    const inicio = { lat: 4.5, lng: -75.75 };
    
    // Ordenar pedidos por proximidad
    let ruta = [];
    let pedidosRestantes = [...pedidosDomiciliario];
    let puntoActual = inicio;
    
    while (pedidosRestantes.length > 0) {
        // Encontrar el pedido más cercano al punto actual
        let indiceMasCercano = 0;
        let distanciaMinima = calcularDistancia(
            puntoActual,
            pedidosRestantes[0]
        );
        
        for (let i = 1; i < pedidosRestantes.length; i++) {
            const distancia = calcularDistancia(puntoActual, pedidosRestantes[i]);
            if (distancia < distanciaMinima) {
                distanciaMinima = distancia;
                indiceMasCercano = i;
            }
        }
        
        // Añadir el pedido más cercano a la ruta
        ruta.push(pedidosRestantes[indiceMasCercano]);
        puntoActual = pedidosRestantes[indiceMasCercano];
        pedidosRestantes.splice(indiceMasCercano, 1);
    }
    
    // Mostrar la ruta en el mapa
    mostrarRuta(ruta, domiciliario);
}

// Función para calcular distancia entre dos puntos
function calcularDistancia(punto1, punto2) {
    const lat1 = punto1.lat;
    const lon1 = punto1.lng;
    const lat2 = punto2.lat;
    const lon2 = punto2.lng;
    
    // Fórmula de Haversine
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Función para mostrar la ruta en el mapa
function mostrarRuta(rutaPedidos, domiciliario) {
    if (rutaPedidos.length === 0) return;
    
    const directionsRenderer = new google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: true,
        polylineOptions: {
            strokeColor: domiciliario === '1' ? '#FF0000' : 
                        domiciliario === '2' ? '#00FF00' : '#0000FF'
        }
    });
    
    directionsRenderers.push(directionsRenderer);
    
    // Crear waypoints para la ruta
    const waypoints = rutaPedidos.slice(0, -1).map(pedido => ({
        location: new google.maps.LatLng(pedido.lat, pedido.lng),
        stopover: true
    }));
    
    const origen = new google.maps.LatLng(4.5, -75.75); // Punto de inicio
    const destino = new google.maps.LatLng(
        rutaPedidos[rutaPedidos.length - 1].lat,
        rutaPedidos[rutaPedidos.length - 1].lng
    );
    
    const request = {
        origin: origen,
        destination: destino,
        waypoints: waypoints,
        optimizeWaypoints: true,
        travelMode: google.maps.TravelMode.DRIVING
    };
    
    directionsService.route(request, (result, status) => {
        if (status === 'OK') {
            directionsRenderer.setDirections(result);
            mostrarInstruccionesRuta(result, rutaPedidos, domiciliario);
        }
    });
}

// Función para mostrar las instrucciones de la ruta
function mostrarInstruccionesRuta(result, rutaPedidos, domiciliario) {
    const rutasContainer = document.getElementById('rutasOptimizadas');
    const rutaDiv = document.createElement('div');
    rutaDiv.className = 'ruta';
    
    let contenido = `<h3>Ruta para Domiciliario ${domiciliario}</h3>`;
    contenido += '<ol>';
    
    rutaPedidos.forEach((pedido, index) => {
        contenido += `
            <li>
                <strong>Parada ${index + 1}:</strong> ${pedido.direccion}<br>
                <em>Pedido:</em> ${pedido.descripcion}
            </li>
        `;
    });
    
    contenido += '</ol>';
    rutaDiv.innerHTML = contenido;
    rutasContainer.appendChild(rutaDiv);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Manejar el envío del formulario
    document.getElementById('pedidoForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const direccion = document.getElementById('direccion').value;
        const descripcion = document.getElementById('pedido').value;
        const domiciliario = document.getElementById('domiciliario').value;
        
        guardarPedido(direccion, descripcion, domiciliario);
        
        // Limpiar el formulario
        document.getElementById('direccion').value = '';
        document.getElementById('pedido').value = '';
    });
});

// Función para exportar rutas
function exportarRutas() {
    const rutasExport = pedidos.map(pedido => ({
        direccion: pedido.direccion,
        descripcion: pedido.descripcion,
        domiciliario: pedido.domiciliario,
        coordenadas: {
            lat: pedido.lat,
            lng: pedido.lng
        }
    }));
    
    const blob = new Blob([JSON.stringify(rutasExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rutas_domicilios.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Función para importar rutas
function importarRutas(archivo) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const rutasImportadas = JSON.parse(e.target.result);
            pedidos = rutasImportadas.map(ruta => ({
                id: Date.now() + Math.random(),
                direccion: ruta.direccion,
                descripcion: ruta.descripcion,
                domiciliario: ruta.domiciliario,
                lat: ruta.coordenadas.lat,
                lng: ruta.coordenadas.lng
            }));
            
            localStorage.setItem('pedidos', JSON.stringify(pedidos));
            limpiarMarcadores();
            mostrarPedidos();
            pedidos.forEach(pedido => añadirMarcador(pedido));
            optimizarRutas();
        } catch (error) {
            alert('Error al importar el archivo: ' + error.message);
        }
    };
    reader.readAsText(archivo);
}

// Función para recalcular todas las rutas
function recalcularRutas() {
    limpiarMarcadores();
    pedidos.forEach(pedido => añadirMarcador(pedido));
    optimizarRutas();
}

// Función para obtener estadísticas de las rutas
function obtenerEstadisticas() {
    const stats = {
        totalPedidos: pedidos.length,
        pedidosPorDomiciliario: {},
        distanciaTotal: 0
    };
    
    // Contar pedidos por domiciliario
    pedidos.forEach(pedido => {
        if (!stats.pedidosPorDomiciliario[pedido.domiciliario]) {
            stats.pedidosPorDomiciliario[pedido.domiciliario] = 0;
        }
        stats.pedidosPorDomiciliario[pedido.domiciliario]++;
    });
    
    // Calcular distancia total aproximada
    const pedidosPorDomiciliario = {};
    pedidos.forEach(pedido => {
        if (!pedidosPorDomiciliario[pedido.domiciliario]) {
            pedidosPorDomiciliario[pedido.domiciliario] = [];
        }
        pedidosPorDomiciliario[pedido.domiciliario].push(pedido);
    });
    
    Object.values(pedidosPorDomiciliario).forEach(rutaDomiciliario => {
        if (rutaDomiciliario.length > 1) {
            for (let i = 0; i < rutaDomiciliario.length - 1; i++) {
                stats.distanciaTotal += calcularDistancia(
                    rutaDomiciliario[i],
                    rutaDomiciliario[i + 1]
                );
            }
        }
    });
    
    return stats;
}

// Función para mostrar estadísticas en la interfaz
function mostrarEstadisticas() {
    const stats = obtenerEstadisticas();
    const statsDiv = document.createElement('div');
    statsDiv.className = 'panel';
    statsDiv.innerHTML = `
        <h3>Estadísticas de Rutas</h3>
        <p>Total de Pedidos: ${stats.totalPedidos}</p>
        <p>Distancia Total Aproximada: ${stats.distanciaTotal.toFixed(2)} km</p>
        <h4>Pedidos por Domiciliario:</h4>
        ${Object.entries(stats.pedidosPorDomiciliario).map(([dom, cant]) => 
            `<p>Domiciliario ${dom}: ${cant} pedidos</p>`
        ).join('')}
    `;
    
    const container = document.querySelector('.rutas-container');
    container.appendChild(statsDiv);
}

// Función para validar direcciones
function validarDireccion(direccion) {
    // Eliminar caracteres especiales y espacios extras
    direccion = direccion.trim().replace(/[^a-zA-Z0-9\s#-]/g, '');
    
    // Verificar longitud mínima
    if (direccion.length < 5) {
        return false;
    }
    
    return direccion;
}

// Función para manejar errores de geocodificación
function manejarErrorGeocoding(status) {
    const mensajes = {
        'ZERO_RESULTS': 'No se encontró la dirección especificada.',
        'OVER_QUERY_LIMIT': 'Se ha excedido el límite de consultas. Intente más tarde.',
        'REQUEST_DENIED': 'La solicitud fue denegada.',
        'INVALID_REQUEST': 'La solicitud es inválida.',
        'UNKNOWN_ERROR': 'Error desconocido al procesar la dirección.'
    };
    
    return mensajes[status] || 'Error al procesar la dirección.';
}