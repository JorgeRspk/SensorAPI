const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();
const {InfluxDBClient, Point} = require('@influxdata/influxdb3-client');

const app = express();
const port = 3002;

const token = process.env.INFLUXDB_TOKEN
const url = process.env.INFLUXDB_URL
const org = process.env.INFLUXDB_ORG
const bucket = process.env.INFLUXDB_BUCKET

async function main() {
    const client = new InfluxDBClient({host: url, token: token})

    // following code goes here

    client.close()
}

// Configuración de CORS
app.use(cors());
app.use(express.json());

// Configuración de la conexión a PostgreSQL
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: false,
    }
});




// -------------------------    Endpoints PostgreSQL  -----------------------------------

// Endpoint para obtener los últimos 50 valores de los sensores
app.get('/sensor-values', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT moisture_percent, temperature, time FROM sensorvalues ORDER BY time DESC LIMIT 50'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener datos de sensores:', error);
        res.status(500).json({ error: 'Error al obtener datos de sensores' });
    }
});

// Endpoint para obtener valores en un rango de fechas
app.get('/sensor-values/range', async (req, res) => {
    const { startDate, endDate } = req.query;
    
    try {
        const result = await pool.query(
            'SELECT moisture_percent, temperature, time FROM sensorvalues WHERE time BETWEEN $1 AND $2 ORDER BY time DESC',
            [startDate, endDate]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener datos de sensores por rango:', error);
        res.status(500).json({ error: 'Error al obtener datos de sensores por rango' });
    }
});

// Endpoint para obtener el último valor registrado
app.get('/sensor-values/latest', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT moisture_percent, temperature, time FROM sensorvalues ORDER BY time DESC LIMIT 1'
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al obtener último dato de sensores:', error);
        res.status(500).json({ error: 'Error al obtener último dato de sensores' });
    }
});

// Endpoint para obtener los dispositivos de una organización
app.get('/api/organizations/:orgId/devices', async (req, res) => {
    const { orgId } = req.params;
    
    try {
        const result = await pool.query(`
            SELECT 
                d.id,
                d.nombre,
                d.description,
                d.fk_modelo_id,
                d.fecha_creacion,
                d.enable,
                d.last_connection,
                d.mac,
                md.id as modelo_id,
                md.nombre as modelo_nombre,
                md.descripcion as modelo_descripcion
            FROM Device d
            JOIN modelo_device md ON d.fk_modelo_id = md.id
            WHERE d.fk_org_id = $1
            ORDER BY d.nombre
        `, [orgId]);

        // Transformar los resultados para que coincidan con la interfaz esperada
        const devices = result.rows.map(row => ({
            id: row.id,
            nombre: row.nombre,
            description: row.description,
            fk_modelo_id: row.fk_modelo_id,
            fecha_creacion: row.fecha_creacion,
            enable: row.enable,
            last_connection: row.last_connection,
            mac: row.mac,
            modelo: {
                id: row.modelo_id,
                nombre: row.modelo_nombre,
                descripcion: row.modelo_descripcion
            }
        }));

        res.json(devices);
    } catch (error) {
        console.error('Error al obtener dispositivos de la organización:', error);
        res.status(500).json({ error: 'Error al obtener dispositivos de la organización' });
    }
});

// Endpoint para obtener los sensores por ID de organización
app.get('/api/organizations/:orgId/sensors', async (req, res) => {
    const { orgId } = req.params;
    
    try {
        const result = await pool.query(`
            SELECT 
                s.id,
                s.nombre,
                s.fecha_creacion,
                s.habilitada,
                s.nodo,
                s.id_tipo_sensor,
                s.id_modelo,
                s.last_connection,
                ts.id as tipo_sensor_id,
                ts.nombre as tipo_sensor_nombre,
                ts.descripcion as tipo_sensor_descripcion,
                ms.id as modelo_sensor_id,
                ms.nombre as modelo_sensor_nombre,
                ms.descripcion as modelo_sensor_descripcion
            FROM Sensor s
            JOIN tipo_sensor ts ON s.id_tipo_sensor = ts.id
            JOIN modelo_sensor ms ON s.id_modelo = ms.id
            WHERE s.id_org = $1
            ORDER BY s.nombre
        `, [orgId]);

        // Transformar los resultados para que coincidan con la interfaz esperada
        const sensors = result.rows.map(row => ({
            id: row.id,
            nombre: row.nombre,
            fecha_creacion: row.fecha_creacion,
            habilitada: row.habilitada,
            nodo: row.nodo,
            id_tipo_sensor: row.id_tipo_sensor,
            id_modelo: row.id_modelo,
            last_connection: row.last_connection,
            tipo_sensor: {
                id: row.tipo_sensor_id,
                nombre: row.tipo_sensor_nombre,
                descripcion: row.tipo_sensor_descripcion
            },
            modelo_sensor: {
                id: row.modelo_sensor_id,
                nombre: row.modelo_sensor_nombre,
                descripcion: row.modelo_sensor_descripcion
            }
        }));

        res.json(sensors);
    } catch (error) {
        console.error('Error al obtener sensores de la organización:', error);
        res.status(500).json({ error: 'Error al obtener sensores de la organización' });
    }
});

// Endpoint para obtener los sensores de un dispositivo
app.get('/api/devices/:deviceId/sensors', async (req, res) => {
    const { deviceId } = req.params;
    
    try {
        const result = await pool.query(`
            SELECT 
                s.id,
                s.nombre,
                s.fecha_creacion,
                s.habilitada,
                s.nodo,
                s.id_tipo_sensor,
                s.id_modelo,
                s.last_connection,
                ts.id as tipo_sensor_id,
                ts.nombre as tipo_sensor_nombre,
                ts.descripcion as tipo_sensor_descripcion,
                ms.id as modelo_sensor_id,
                ms.nombre as modelo_sensor_nombre,
                ms.descripcion as modelo_sensor_descripcion,
                json_agg(
                    json_build_object(
                        'id', c.id,
                        'nombre', c.nombre,
                        'data_type', c.data_type,
                        'unidad_medida', c.unidad_medida
                    )
                ) as columnas
            FROM Sensor s
            JOIN tipo_sensor ts ON s.id_tipo_sensor = ts.id
            JOIN modelo_sensor ms ON s.id_modelo = ms.id
            LEFT JOIN Columnas c ON s.id = c.dispositivoID
            WHERE s.id_device = $1
            GROUP BY s.id, ts.id, ms.id
            ORDER BY s.nombre
        `, [deviceId]);

        // Transformar los resultados para que coincidan con la interfaz esperada
        const sensors = result.rows.map(row => ({
            id: row.id,
            nombre: row.nombre,
            fecha_creacion: row.fecha_creacion,
            habilitada: row.habilitada,
            nodo: row.nodo,
            id_tipo_sensor: row.id_tipo_sensor,
            id_modelo: row.id_modelo,
            last_connection: row.last_connection,
            tipo_sensor: {
                id: row.tipo_sensor_id,
                nombre: row.tipo_sensor_nombre,
                descripcion: row.tipo_sensor_descripcion
            },
            modelo_sensor: {
                id: row.modelo_sensor_id,
                nombre: row.modelo_sensor_nombre,
                descripcion: row.modelo_sensor_descripcion
            },
            columnas: row.columnas || []
        }));

        res.json(sensors);
    } catch (error) {
        console.error('Error al obtener sensores del dispositivo:', error);
        res.status(500).json({ error: 'Error al obtener sensores del dispositivo' });
    }
});

// Endpoint para obtener una organización por ID
app.get('/api/organizations/:orgId', async (req, res) => {
    const { orgId } = req.params;
    
    try {
        const result = await pool.query(`
            SELECT id, nombre
            FROM Organizacion
            WHERE id = $1
        `, [orgId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Organización no encontrada' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al obtener la organización:', error);
        res.status(500).json({ error: 'Error al obtener la organización' });
    }
});

// Endpoit de los 

// Endpoit para rescatar los measurments de la base de datos de postgres de una organizacion especifica
app.get('/api/organizations/:orgId/measurements', async (req, res) => {
    const { orgId } = req.params;
    try {
        const result = await pool.query(`
            SELECT DISTINCT c.nombre
            FROM columnas c
            JOIN sensor sn ON c.dispositivoid = sn.id 
            WHERE sn.id_org = $1
            ORDER BY nombre
        `, [orgId]);
        const measurements = result.rows.map(row => row.nombre);
        res.json(measurements);
    } catch (error) {
        console.error('Error al obtener los measurements:', error);
        res.status(500).json({ error: 'Error al obtener los measurements' });
    }
});

// Endpoint para insertar datos en una tabla de PostgreSQL de un dispositivo específico, lel nombre de tabla debe ser igual al nombre del dispositivo
app.post('/api/devices/:deviceId/data', async (req, res) => {
    const { deviceId } = req.params;
    // data en json
    const  data = req.body; // Suponiendo que los datos vienen en el cuerpo de la solicitud

    const fecha_actual = new Date().toISOString(); // Obtener la fecha y hora actual en formato ISO 8601

    try {
        console.log('Datos recibidos:', req.body); // Log para verificar los datos recibidos
        // Insertar los datos en la tabla correspondiente al dispositivo con la fecha actual
        const query = `INSERT INTO "${deviceId}" (humedad, temperatura, timestamp) VALUES ($1, $2, $3)`;
        await pool.query(query, [data.moisture_percent, data.temperature, fecha_actual]);

        res.status(201).json({ message: 'Datos insertados correctamente' });
    } catch (error) {
        console.error('Error al insertar datos en PostgreSQL:', error);
        res.status(500).json({ error: 'Error al insertar datos en PostgreSQL' });
    }
});

// Endpoint para obtener datos de un sensor específico desde postgreSQL, especificar numero de registros a obtener
app.get('/api/sensors/:sensorId/data', async (req, res) => {
    const { sensorId } = req.params;
    const { limit = 50 } = req.query; // Limitar a 50 registros por defecto
    console.log('Sensor ID:', sensorId); // Log para verificar el ID del sensor

    try {
        const result = await pool.query(
            `SELECT humedad, temperatura, timestamp FROM "${sensorId}" ORDER BY timestamp DESC LIMIT $1`,
            [limit]
        );
        //mostrar los datos en consola
        console.log('Datos obtenidos:', result.rows); // Log para verificar los datos obtenidos
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener datos del sensor:', error);
        res.status(500).json({ error: 'Error al obtener datos del sensor' });
    }
});


// Endpoint de prueba para verificar que la API está funcionando
app.get('/api/test', (req, res) => {
    console.log('API funcionando correctamente');
    res.json({ message: 'API funcionando correctamente' });
});


// Ruta de prueba
app.get('/', (req, res) => {
    res.send('API de Sensores funcionando');
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});