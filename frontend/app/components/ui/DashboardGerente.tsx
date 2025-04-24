import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer 
} from 'recharts';
import { dashboardApi } from '@/lib/api'; // Importa la API que acabamos de crear

// Colores para los gráficos
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// Formateador de moneda para mostrar valores en pesos
const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(value);
};

// Formateador de fecha para mostrar fechas en formato legible
const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-CO', {
        day: '2-digit',
        month: '2-digit'
    }).format(date);
};

export default function DashboardGerente() {
  // Estados para los datos y UI
  const [periodo, setPeriodo] = useState('semana');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  interface DashboardVentasResponse {
    ventas: { periodo: string; total_ventas: number; cantidad_pedidos: number }[];
    resumen: {
      total_ventas: number;
      cantidad_pedidos: number;
      ticket_promedio: number;
      tendencia: number;
    };
  }
  
  interface DashboardProductosResponse {
    productos_populares: { nombre: string; veces_ordenado: number }[];
  }
  
  interface DashboardUsuariosResponse {
    usuarios_rendimiento: { nombre: string; total_ventas: number; pedidos_atendidos: number }[];
  }
  
  interface DashboardData {
    ventas: DashboardVentasResponse;
    productos: DashboardProductosResponse;
    usuarios: DashboardUsuariosResponse;
  }
  
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    ventas: { ventas: [], resumen: { total_ventas: 0, cantidad_pedidos: 0, ticket_promedio: 0, tendencia: 0 } },
    productos: { productos_populares: [] },
    usuarios: { usuarios_rendimiento: [] },
  });

  // Cargar datos cuando cambia el periodo
  useEffect(() => {
    fetchDashboardData();
  }, [periodo]);

  // Función para cargar los datos del dashboard
  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await dashboardApi.getAll(periodo);
      setDashboardData(data);
    } catch (err) {
      console.error('Error al cargar datos del dashboard:', err);
      setError('No se pudieron cargar los datos. Por favor intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Formatear nombres de usuario para mostrar más legibles
const formatUserName = (username: string): string => {
    if (!username) return '';
    // Si es una dirección de correo, mostrar solo la parte antes del @
    if (username.includes('@')) {
        return username.split('@')[0];
    }
    // Si es un nombre.apellido, formatear como Nombre
    if (username.includes('.')) {
        const [firstName] = username.split('.');
        return firstName.charAt(0).toUpperCase() + firstName.slice(1);
    }
    return username;
};

  return (
    <div className="p-6 max-w-7xl mx-auto bg-white rounded-lg shadow">
      {/* Encabezado y controles */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4 md:mb-0">Dashboard de Gerencia</h1>
        <div className="flex items-center gap-4">
          <select 
            value={periodo} 
            onChange={(e) => setPeriodo(e.target.value)}
            className="px-4 py-2 border rounded-md text-gray-700"
          >
            <option value="dia">Hoy</option>
            <option value="semana">Esta semana</option>
            <option value="mes">Este mes</option>
            <option value="trimestre">Este trimestre</option>
          </select>
          <button 
            onClick={fetchDashboardData} 
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
          >
            {isLoading ? 'Actualizando...' : 'Actualizar datos'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {isLoading ? (
        // Esqueleto de carga
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg shadow h-64 animate-pulse"></div>
          <div className="bg-gray-50 p-4 rounded-lg shadow h-64 animate-pulse"></div>
          <div className="bg-gray-50 p-4 rounded-lg shadow h-64 col-span-1 md:col-span-2 animate-pulse"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Resumen de KPIs */}
            <div className="bg-gray-50 p-4 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4 text-gray-700">Resumen de Ventas</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-md shadow">
                  <p className="text-sm text-gray-500">Ventas Totales</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-700">
                    {formatCurrency(dashboardData.ventas.resumen.total_ventas)}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-md shadow">
                  <p className="text-sm text-gray-500">Pedidos</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-700">
                    {dashboardData.ventas.resumen.cantidad_pedidos}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-md shadow">
                  <p className="text-sm text-gray-500">Ticket Promedio</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-700">
                    {formatCurrency(dashboardData.ventas.resumen.ticket_promedio)}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-md shadow">
                  <p className="text-sm text-gray-500">Tendencia</p>
                  <p className={`text-xl md:text-2xl font-bold ${
                    dashboardData.ventas.resumen.tendencia >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {dashboardData.ventas.resumen.tendencia >= 0 ? '+' : ''}
                    {dashboardData.ventas.resumen.tendencia}%
                  </p>
                </div>
              </div>
            </div>

            {/* Productos más vendidos */}
            <div className="bg-gray-50 p-4 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4 text-gray-700">Productos Más Vendidos</h2>
              {dashboardData.productos.productos_populares.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={dashboardData.productos.productos_populares.slice(0, 5)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="veces_ordenado"
                      nameKey="nombre"
                      label={({ nombre, percent }) => 
                        `${nombre.substring(0, 10)}${nombre.length > 10 ? '...' : ''}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {dashboardData.productos.productos_populares.slice(0, 5).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name, props) => [value, props.payload.nombre]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-48 text-gray-500">
                  No hay datos disponibles para este período
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 mb-6">
            {/* Gráfico de ventas por tiempo */}
            <div className="bg-gray-50 p-4 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4 text-gray-700">Tendencia de Ventas</h2>
              {dashboardData.ventas.ventas.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dashboardData.ventas.ventas}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="periodo" 
                      tickFormatter={periodo === 'dia' ? 
                        (time) => new Date(time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 
                        formatDate} 
                    />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'total_ventas' && typeof value === 'number' ? formatCurrency(value) : value,
                        name === 'total_ventas' ? 'Ventas' : 'Pedidos'
                      ]}
                      labelFormatter={periodo === 'dia' ? 
                        (time) => new Date(time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 
                        formatDate}
                    />
                    <Legend />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="total_ventas" 
                      stroke="#8884d8" 
                      name="Ventas" 
                      strokeWidth={2}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="cantidad_pedidos" 
                      stroke="#82ca9d" 
                      name="Pedidos" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-48 text-gray-500">
                  No hay datos disponibles para este período
                </div>
              )}
            </div>

            {/* Rendimiento de empleados */}
            <div className="bg-gray-50 p-4 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4 text-gray-700">Rendimiento de Empleados</h2>
              {dashboardData.usuarios.usuarios_rendimiento.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dashboardData.usuarios.usuarios_rendimiento}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="nombre" 
                      tickFormatter={(name) => name.length > 8 ? `${name.substring(0, 8)}...` : name} 
                    />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'total_ventas' && typeof value === 'number' ? formatCurrency(value) : value,
                        name === 'total_ventas' ? 'Ventas' : 'Pedidos'
                      ]}
                    />
                    <Legend />
                    <Bar 
                      yAxisId="left"
                      dataKey="total_ventas" 
                      name="Ventas" 
                      fill="#8884d8" 
                    />
                    <Bar 
                      yAxisId="right"
                      dataKey="pedidos_atendidos" 
                      name="Pedidos" 
                      fill="#82ca9d" 
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-48 text-gray-500">
                  No hay datos disponibles para este período
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}