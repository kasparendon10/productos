// Cargar el archivo JSON una sola vez
let productsData = [];

fetch('productos.json')
  .then(response => response.json())
  .then(data => {
    productsData = data;
    initializeTable(productsData);
  })
  .catch(error => console.error('Error al cargar los productos:', error));

// Inicializar la tabla con DataTables
function initializeTable(products) {
  const tableBody = $('#productTable tbody');
  
  // Limpiar la tabla antes de renderizar
  tableBody.empty();

  products.forEach(product => {
    const ivaText = product.iva ? 'Sí' : 'No';
    const row = `
      <tr>
        <td>${product.codigo}</td>
        <td>${product.nombre}</td>
        <td class="precio-detal">${product.precios.detal}</td>
        <td class="precio-mayorista">${product.precios.mayorista}</td>
        <td class="precio-restaurante">${product.precios.restaurante}</td>
        <td class="Precio-caja">${product.precios.caja}</td>
        <td class="cantidad_caja">${product.precios.cantidad_caja}</td>
        <td><span class="iva">${ivaText}</span></td>
        <td>${product.descripcion.tipo}, ${product.descripcion.origen}</td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="goToCalculator('${product.codigo}')">Calcular</button>
          <button class="btn btn-info btn-sm" onclick="goToDescription('${product.codigo}')">Descripción</button>
        </td>
      </tr>
    `;
    tableBody.append(row);
  });

  // Inicializar DataTable
  $('#productTable').DataTable();
}

// Redirigir a calculator.html pasando el código del producto
function goToCalculator(codigo) {
  const url = `calculator.html?codigo=${codigo}`;
  window.location.href = url;
}

// Redirigir a la página de descripción con el código del producto
function goToDescription(codigo) {
  const url = `product-description.html?codigo=${codigo}`;
  window.location.href = url;
}

// Obtener el producto por código desde los datos cargados
function getProductByCodigo(codigo) {
  return productsData.find(p => p.codigo === codigo);
}
