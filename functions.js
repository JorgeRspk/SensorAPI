// Funciones para manejar la base de datos y las alertas
const { Pool } = require('pg'); // Importar el pool de conexiones a la base de datos
const nodemailer = require('nodemailer'); // Importar nodemailer para enviar correos electrónicos
const dotenv = require('dotenv'); // Importar dotenv para manejar variables de entorno

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

// funcion para insertar datos en tabla notificacion , retorna el id de la notificacion insertada
async function insertNotificationData(user_id, id_tipo, mensaje, titulo, metadata, destino) {
    const query = `INSERT INTO notificacion (user_id, id_tipo, mensaje, titulo, metadata, destino) VALUES ($1, $2, $3, $4, $5, $6)`;
    await pool.query(query, [user_id, id_tipo, mensaje, titulo, metadata, destino]);
    // Obtener el id de la notificacion insertada
    const result = await pool.query('SELECT id_notificacion FROM notificacion WHERE user_id = $1 AND id_tipo = $2 AND mensaje = $3 AND titulo = $4 AND metadata = $5 AND destino = $6', [user_id, id_tipo, mensaje, titulo, metadata, destino]);
    return result.rows[0].id_notificacion; // Retornar el id de la notificacion insertada
}

// Funcion para insertar datos en tabla de alertas 
async function insertAlertData(id_notificacion, metric_name, value, sensor_id, max_or_min) {
    const query = `INSERT INTO alerta (id_notificacion, metric_name, value, sensor_id, max_or_min) VALUES ($1, $2, $3, $4, $5)`;
    await pool.query(query, [id_notificacion, metric_name, value, sensor_id, max_or_min]);
}

// Funcion envio de notificaciones por correo electronico
async function sendEmailNotification(user_id, id_tipo, mensaje, titulo, metadata, destino) {
    // Aquí puedes implementar la lógica para enviar un correo electrónico
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: process.env.MAIL_USERNAME,
          pass: process.env.MAIL_PASSWORD,
          clientId: process.env.OAUTH_CLIENTID,
          clientSecret: process.env.OAUTH_CLIENT_SECRET,
          refreshToken: process.env.OAUTH_REFRESH_TOKEN
        }
      });
    
    const mailOptions = {
        from: destino,
        to: destino,
        subject: titulo,
        text: mensaje
      };
    
    transporter.sendMail(mailOptions, function(err, data) {
        if (err) {
          console.log("Error " + err);
        } else {
          console.log("Email sent successfully");
        }
      });
    console.log(`Enviando correo a ${user_id} con mensaje: ${mensaje}`);
}

exports.insertNotificationData = insertNotificationData; // Exportar la función para insertar datos en la tabla de notificaciones
exports.insertAlertData = insertAlertData; // Exportar la función para insertar datos en la tabla de alertas
exports.sendEmailNotification = sendEmailNotification; // Exportar la función para enviar notificaciones por correo electrónico