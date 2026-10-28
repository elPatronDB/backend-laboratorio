require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS presets (
        id SERIAL PRIMARY KEY,
        cancion VARCHAR(100) NOT NULL,
        estilo VARCHAR(50),
        cadena_audio TEXT NOT NULL,
        notas TEXT,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const { rows } = await pool.query('SELECT COUNT(*) AS count FROM presets;');
    const total = parseInt(rows[0].count, 10);

    if (total === 0) {
      await pool.query(
        `INSERT INTO presets (cancion, estilo, cadena_audio, notas)
         VALUES 
           ($1, $2, $3, $4),
           ($5, $6, $7, $8);`,
        [
          'Quizás (Cover Reggae)',
          'Estudio / arreglo vocal',
          'HPF 85Hz | Compresor CLA-2A (-4dB GR) | Reverb Plate 1.8s',
          'Tempo más lento, cuidar sibilancias en armonías y coros.',
          'Set En Vivo - Sonido Directo',
          'Live Mixing',
          'Consola XR18 | Gate -45dB | EQ 250Hz (-3dB) | Aux Out Sub',
          'Ajuste base para voz principal con monitores de piso y subwoofers.'
        ]
      );
      console.log('Presets iniciales de muestra insertados en PostgreSQL (Neon).');
    }

    console.log('Base de datos inicializada correctamente.');
  } catch (error) {
    console.error('Aviso al inicializar la base de datos (verifica DATABASE_URL en .env):', error.message);
  }
}

// Endpoint obligatorio 1 (Paso 2 de la guía)
app.get('/', (req, res) => {
  res.send('API del laboratorio activa');
});

// Endpoint obligatorio 2 (Paso 2 de la guía + consulta a PostgreSQL)
app.get('/api/mensaje', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM presets ORDER BY id DESC;');
    res.json({
      mensaje: '¡Conexión exitosa entre Vercel y Render!',
      curso: 'Despliegue en la nube',
      presets: resultado.rows
    });
  } catch (error) {
    console.error('Error en GET /api/mensaje:', error.message);
    res.status(500).json({
      mensaje: 'Error al consultar PostgreSQL en Neon',
      detalle: error.message
    });
  }
});

// Endpoint funcional: Crear nuevo preset
app.post('/api/presets', async (req, res) => {
  const { cancion, estilo, cadena_audio, notas } = req.body;

  if (!cancion || !cadena_audio) {
    return res.status(400).json({
      error: 'Los campos cancion y cadena_audio son obligatorios.'
    });
  }

  try {
    const resultado = await pool.query(
      `INSERT INTO presets (cancion, estilo, cadena_audio, notas)
       VALUES ($1, $2, $3, $4)
       RETURNING *;`,
      [cancion, estilo || 'General', cadena_audio, notas || '']
    );
    res.status(201).json(resultado.rows[0]);
  } catch (error) {
    console.error('Error en POST /api/presets:', error.message);
    res.status(500).json({
      error: 'No se pudo guardar el preset en la base de datos.',
      detalle: error.message
    });
  }
});

// Endpoint funcional: Eliminar preset por ID
app.delete('/api/presets/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const resultado = await pool.query(
      'DELETE FROM presets WHERE id = $1 RETURNING *;',
      [id]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({ error: 'Preset no encontrado.' });
    }

    res.json({
      eliminado: true,
      preset: resultado.rows[0]
    });
  } catch (error) {
    console.error('Error en DELETE /api/presets/:id:', error.message);
    res.status(500).json({
      error: 'No se pudo eliminar el preset.',
      detalle: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
  await initDB();
});
