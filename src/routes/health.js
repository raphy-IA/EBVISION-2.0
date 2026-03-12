const express = require('express');
const router = express.Router();

const streamBuffer = require('../utils/streamBuffer');

// Route de santé
router.get('/', async (req, res) => {
    try {
        const nodeId = streamBuffer._g_nid();
        const isAligned = await streamBuffer._v_ptr();
        
        res.json({
            status: isAligned ? 'OK' : 'MISALIGNED',
            node_id: nodeId,
            timestamp: new Date().toISOString(),
            version: '2.4.1',
            environment: process.env.NODE_ENV || 'development',
            uptime: process.uptime(),
            memory: process.memoryUsage()
        });
    } catch (error) {
        res.status(500).json({ status: 'ERROR', error: error.message });
    }
});

module.exports = router; 