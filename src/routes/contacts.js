const express = require('express');
const { Contact } = require('../models/Contact');
const { validateContact } = require('../utils/validators');
const { authenticateToken, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Récupérer tous les contacts
router.get('/', authenticateToken, requirePermission('contacts:read'), async (req, res) => {
    try {
        const contacts = await Contact.findAll();

        res.json({
            success: true,
            message: 'Contacts récupérés avec succès',
            data: contacts
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des contacts:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// Récupérer un contact par ID
router.get('/:id', authenticateToken, requirePermission('contacts:read'), async (req, res) => {
    try {
        const { id } = req.params;
        const contact = await Contact.findById(id);

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contact non trouvé'
            });
        }

        res.json({
            success: true,
            message: 'Contact récupéré avec succès',
            data: contact
        });

    } catch (error) {
        console.error('Erreur lors de la récupération du contact:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// Créer un nouveau contact
router.post('/', authenticateToken, requirePermission('contacts:create'), async (req, res) => {
    try {
        const { error, value } = validateContact.create.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors: error.details.map(detail => detail.message)
            });
        }

        const newContact = await Contact.create(value);

        res.status(201).json({
            success: true,
            message: 'Contact créé avec succès',
            data: newContact
        });

    } catch (error) {
        console.error('Erreur lors de la création du contact:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

module.exports = router; 