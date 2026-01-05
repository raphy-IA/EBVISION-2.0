const express = require('express');
const { Contact } = require('../models/Contact');
const { validateContact } = require('../utils/validators');
const { authenticateToken, requirePermission } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Contact:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the contact
 *         nom:
 *           type: string
 *         prenom:
 *           type: string
 *         email:
 *           type: string
 *         telephone:
 *           type: string
 *         entreprise_id:
 *           type: string
 *           description: ID of the associated company
 *       example:
 *         id: "cnt_123"
 *         nom: "Doe"
 *         prenom: "John"
 *         email: "john@example.com"
 *         entreprise_id: "comp_456"
 */

/**
 * @swagger
 * tags:
 *   name: Contacts
 *   description: Managing contacts (Read-Only for AI)
 */

/**
 * @swagger
 * /contacts:
 *   get:
 *     summary: Returns the list of all contacts
 *     tags: [Contacts]
 *     responses:
 *       200:
 *         description: The list of the contacts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Contact'
 */
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

/**
 * @swagger
 * /contacts/{id}:
 *   get:
 *     summary: Get a contact by ID
 *     tags: [Contacts]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The contact ID
 *     responses:
 *       200:
 *         description: The contact description
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Contact'
 *       404:
 *         description: Contact not found
 */
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