const Joi = require('joi');

// Schémas de validation pour les utilisateurs
const userValidation = {
    create: Joi.object({
        nom: Joi.string().min(2).max(50).required()
            .messages({
                'string.min': 'Le nom doit contenir au moins 2 caractères',
                'string.max': 'Le nom ne peut pas dépasser 50 caractères',
                'any.required': 'Le nom est requis'
            }),
        prenom: Joi.string().min(2).max(50).required()
            .messages({
                'string.min': 'Le prénom doit contenir au moins 2 caractères',
                'string.max': 'Le prénom ne peut pas dépasser 50 caractères',
                'any.required': 'Le prénom est requis'
            }),
        email: Joi.string().email().required()
            .messages({
                'string.email': 'Format d\'email invalide',
                'any.required': 'L\'email est requis'
            }),
        password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required()
            .messages({
                'string.min': 'Le mot de passe doit contenir au moins 8 caractères',
                'string.pattern.base': 'Le mot de passe doit contenir au moins une minuscule, une majuscule, un chiffre et un caractère spécial',
                'any.required': 'Le mot de passe est requis'
            }),
        login: Joi.string().min(3).max(50).optional()
            .messages({
                'string.min': 'Le login doit contenir au moins 3 caractères',
                'string.max': 'Le login ne peut pas dépasser 50 caractères'
            }),
        role: Joi.string().valid('ADMIN', 'MANAGER', 'USER', 'ASSISTANT', 'SENIOR', 'DIRECTOR', 'PARTNER').required()
            .messages({
                'any.only': 'Rôle invalide',
                'any.required': 'Le rôle est requis'
            })
    }),

    update: Joi.object({
        nom: Joi.string().min(2).max(50)
            .messages({
                'string.min': 'Le nom doit contenir au moins 2 caractères',
                'string.max': 'Le nom ne peut pas dépasser 50 caractères'
            }),
        prenom: Joi.string().min(2).max(50)
            .messages({
                'string.min': 'Le prénom doit contenir au moins 2 caractères',
                'string.max': 'Le prénom ne peut pas dépasser 50 caractères'
            }),
        email: Joi.string().email()
            .messages({
                'string.email': 'Format d\'email invalide'
            }),
        password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).optional()
            .messages({
                'string.min': 'Le mot de passe doit contenir au moins 8 caractères',
                'string.pattern.base': 'Le mot de passe doit contenir au moins une minuscule, une majuscule, un chiffre et un caractère spécial (@$!%*?&)'
            }),
        login: Joi.string().min(3).max(50)
            .messages({
                'string.min': 'Le login doit contenir au moins 3 caractères',
                'string.max': 'Le login ne peut pas dépasser 50 caractères'
            }),
        role: Joi.string().valid('ADMIN', 'MANAGER', 'USER', 'ASSISTANT', 'SENIOR', 'DIRECTOR', 'PARTNER')
            .messages({
                'any.only': 'Rôle invalide'
            }),
        statut: Joi.string().valid('ACTIF', 'INACTIF', 'CONGE')
            .messages({
                'any.only': 'Statut invalide'
            })
    })
};

// Schémas de validation pour les business units
const businessUnitValidation = {
    create: Joi.object({
        nom: Joi.string().min(2).max(100).required()
            .messages({
                'string.min': 'Le nom doit contenir au moins 2 caractères',
                'string.max': 'Le nom ne peut pas dépasser 100 caractères',
                'any.required': 'Le nom est requis'
            }),
        code: Joi.string().pattern(/^[A-Za-z0-9_-]+$/).min(2).max(10).required()
            .messages({
                'string.pattern.base': 'Le code ne peut contenir que lettres, chiffres, tiret (-) et underscore (_)',
                'string.min': 'Le code doit contenir au moins 2 caractères',
                'string.max': 'Le code ne peut pas dépasser 10 caractères',
                'any.required': 'Le code est requis'
            }),
        description: Joi.string().max(500).optional()
            .messages({
                'string.max': 'La description ne peut pas dépasser 500 caractères'
            }),
        statut: Joi.string().valid('ACTIF', 'INACTIF').default('ACTIF')
            .messages({
                'any.only': 'Statut invalide'
            })
    }),

    update: Joi.object({
        nom: Joi.string().min(2).max(100)
            .messages({
                'string.min': 'Le nom doit contenir au moins 2 caractères',
                'string.max': 'Le nom ne peut pas dépasser 100 caractères'
            }),
        code: Joi.string().pattern(/^[A-Za-z0-9_-]+$/).min(2).max(10)
            .messages({
                'string.pattern.base': 'Le code ne peut contenir que lettres, chiffres, tiret (-) et underscore (_)',
                'string.min': 'Le code doit contenir au moins 2 caractères',
                'string.max': 'Le code ne peut pas dépasser 10 caractères'
            }),
        description: Joi.string().max(500)
            .messages({
                'string.max': 'La description ne peut pas dépasser 500 caractères'
            }),
        statut: Joi.string().valid('ACTIF', 'INACTIF')
            .messages({
                'any.only': 'Statut invalide'
            })
    })
};

// Schémas de validation pour les divisions
const divisionValidation = {
    create: Joi.object({
        nom: Joi.string().min(2).max(100).required()
            .messages({
                'string.min': 'Le nom doit contenir au moins 2 caractères',
                'string.max': 'Le nom ne peut pas dépasser 100 caractères',
                'any.required': 'Le nom est requis'
            }),
        code: Joi.string().min(2).max(10).required()
            .messages({
                'string.min': 'Le code doit contenir au moins 2 caractères',
                'string.max': 'Le code ne peut pas dépasser 10 caractères',
                'any.required': 'Le code est requis'
            }),
        description: Joi.string().max(500).optional()
            .messages({
                'string.max': 'La description ne peut pas dépasser 500 caractères'
            }),
        business_unit_id: Joi.string().uuid().required()
            .messages({
                'string.guid': 'ID de business unit invalide',
                'any.required': 'La business unit est requise'
            }),
        statut: Joi.string().valid('ACTIF', 'INACTIF').default('ACTIF')
            .messages({
                'any.only': 'Statut invalide'
            })
    }),

    update: Joi.object({
        nom: Joi.string().min(2).max(100)
            .messages({
                'string.min': 'Le nom doit contenir au moins 2 caractères',
                'string.max': 'Le nom ne peut pas dépasser 100 caractères'
            }),
        code: Joi.string().min(2).max(10)
            .messages({
                'string.min': 'Le code doit contenir au moins 2 caractères',
                'string.max': 'Le code ne peut pas dépasser 10 caractères'
            }),
        description: Joi.string().max(500)
            .messages({
                'string.max': 'La description ne peut pas dépasser 500 caractères'
            }),
        business_unit_id: Joi.string().uuid()
            .messages({
                'string.guid': 'ID de business unit invalide'
            }),
        statut: Joi.string().valid('ACTIF', 'INACTIF')
            .messages({
                'any.only': 'Statut invalide'
            })
    })
};

// Schémas de validation pour les clients
const clientValidation = {
    create: Joi.object({
        raison_sociale: Joi.string().min(2).max(200).required()
            .messages({
                'string.min': 'La raison sociale doit contenir au moins 2 caractères',
                'string.max': 'La raison sociale ne peut pas dépasser 200 caractères',
                'any.required': 'La raison sociale est requise'
            }),
        siret: Joi.string().pattern(/^\d{14}$/).required()
            .messages({
                'string.pattern.base': 'Le SIRET doit contenir exactement 14 chiffres',
                'any.required': 'Le SIRET est requis'
            }),
        secteur_activite: Joi.string().min(2).max(100).required()
            .messages({
                'string.min': 'Le secteur d\'activité doit contenir au moins 2 caractères',
                'string.max': 'Le secteur d\'activité ne peut pas dépasser 100 caractères',
                'any.required': 'Le secteur d\'activité est requis'
            }),
        effectif: Joi.number().integer().min(1).required()
            .messages({
                'number.integer': 'L\'effectif doit être un nombre entier',
                'number.min': 'L\'effectif doit être au moins de 1',
                'any.required': 'L\'effectif est requis'
            }),
        ca_annuel: Joi.number().positive().required()
            .messages({
                'number.positive': 'Le CA annuel doit être positif',
                'any.required': 'Le CA annuel est requis'
            }),
        adresse: Joi.string().min(10).max(500).required()
            .messages({
                'string.min': 'L\'adresse doit contenir au moins 10 caractères',
                'string.max': 'L\'adresse ne peut pas dépasser 500 caractères',
                'any.required': 'L\'adresse est requise'
            }),
        pays: Joi.string().min(2).max(50).required()
            .messages({
                'string.min': 'Le pays doit contenir au moins 2 caractères',
                'string.max': 'Le pays ne peut pas dépasser 50 caractères',
                'any.required': 'Le pays est requis'
            })
    }),

    update: Joi.object({
        raison_sociale: Joi.string().min(2).max(200)
            .messages({
                'string.min': 'La raison sociale doit contenir au moins 2 caractères',
                'string.max': 'La raison sociale ne peut pas dépasser 200 caractères'
            }),
        siret: Joi.string().pattern(/^\d{14}$/)
            .messages({
                'string.pattern.base': 'Le SIRET doit contenir exactement 14 chiffres'
            }),
        secteur_activite: Joi.string().min(2).max(100)
            .messages({
                'string.min': 'Le secteur d\'activité doit contenir au moins 2 caractères',
                'string.max': 'Le secteur d\'activité ne peut pas dépasser 100 caractères'
            }),
        effectif: Joi.number().integer().min(1)
            .messages({
                'number.integer': 'L\'effectif doit être un nombre entier',
                'number.min': 'L\'effectif doit être au moins de 1'
            }),
        ca_annuel: Joi.number().positive()
            .messages({
                'number.positive': 'Le CA annuel doit être positif'
            }),
        adresse: Joi.string().min(10).max(500)
            .messages({
                'string.min': 'L\'adresse doit contenir au moins 10 caractères',
                'string.max': 'L\'adresse ne peut pas dépasser 500 caractères'
            }),
        pays: Joi.string().min(2).max(50)
            .messages({
                'string.min': 'Le pays doit contenir au moins 2 caractères',
                'string.max': 'Le pays ne peut pas dépasser 50 caractères'
            }),
        statut: Joi.string().valid('PROSPECT', 'CLIENT', 'CLIENT_FIDELE')
            .messages({
                'any.only': 'Statut invalide'
            })
    })
};

// Schémas de validation pour les contacts
const contactValidation = {
    create: Joi.object({
        client_id: Joi.string().uuid().required()
            .messages({
                'string.guid': 'ID de client invalide',
                'any.required': 'Le client est requis'
            }),
        nom: Joi.string().min(2).max(50).required()
            .messages({
                'string.min': 'Le nom doit contenir au moins 2 caractères',
                'string.max': 'Le nom ne peut pas dépasser 50 caractères',
                'any.required': 'Le nom est requis'
            }),
        prenom: Joi.string().min(2).max(50).required()
            .messages({
                'string.min': 'Le prénom doit contenir au moins 2 caractères',
                'string.max': 'Le prénom ne peut pas dépasser 50 caractères',
                'any.required': 'Le prénom est requis'
            }),
        fonction: Joi.string().min(2).max(100).required()
            .messages({
                'string.min': 'La fonction doit contenir au moins 2 caractères',
                'string.max': 'La fonction ne peut pas dépasser 100 caractères',
                'any.required': 'La fonction est requise'
            }),
        email: Joi.string().email().required()
            .messages({
                'string.email': 'Format d\'email invalide',
                'any.required': 'L\'email est requis'
            }),
        telephone: Joi.string().pattern(/^[\+]?[0-9\s\-\(\)]{10,}$/).required()
            .messages({
                'string.pattern.base': 'Format de téléphone invalide',
                'any.required': 'Le téléphone est requis'
            }),
        est_contact_principal: Joi.boolean().default(false)
    }),

    update: Joi.object({
        nom: Joi.string().min(2).max(50)
            .messages({
                'string.min': 'Le nom doit contenir au moins 2 caractères',
                'string.max': 'Le nom ne peut pas dépasser 50 caractères'
            }),
        prenom: Joi.string().min(2).max(50)
            .messages({
                'string.min': 'Le prénom doit contenir au moins 2 caractères',
                'string.max': 'Le prénom ne peut pas dépasser 50 caractères'
            }),
        fonction: Joi.string().min(2).max(100)
            .messages({
                'string.min': 'La fonction doit contenir au moins 2 caractères',
                'string.max': 'La fonction ne peut pas dépasser 100 caractères'
            }),
        email: Joi.string().email()
            .messages({
                'string.email': 'Format d\'email invalide'
            }),
        telephone: Joi.string().pattern(/^[\+]?[0-9\s\-\(\)]{10,}$/)
            .messages({
                'string.pattern.base': 'Format de téléphone invalide'
            }),
        est_contact_principal: Joi.boolean()
    })
};

// Schémas de validation pour les années fiscales
const fiscalYearValidation = {
    create: Joi.object({
        annee: Joi.number().integer().min(2020).max(2030).required()
            .messages({
                'number.integer': 'L\'année doit être un nombre entier',
                'number.min': 'L\'année doit être au moins 2020',
                'number.max': 'L\'année ne peut pas dépasser 2030',
                'any.required': 'L\'année est requise'
            }),
        date_debut: Joi.date().required()
            .messages({
                'any.required': 'La date de début est requise'
            }),
        date_fin: Joi.date().greater(Joi.ref('date_debut')).required()
            .messages({
                'date.greater': 'La date de fin doit être postérieure à la date de début',
                'any.required': 'La date de fin est requise'
            }),
        budget_global: Joi.number().positive().required()
            .messages({
                'number.positive': 'Le budget global doit être positif',
                'any.required': 'Le budget global est requis'
            })
    }),

    update: Joi.object({
        libelle: Joi.string().min(2).max(50)
            .messages({
                'string.min': 'Le libellé doit contenir au moins 2 caractères',
                'string.max': 'Le libellé ne peut pas dépasser 50 caractères'
            }),
        date_debut: Joi.date()
            .messages({
                'any.required': 'La date de début est requise'
            }),
        date_fin: Joi.date().greater(Joi.ref('date_debut'))
            .messages({
                'date.greater': 'La date de fin doit être postérieure à la date de début'
            }),
        budget_global: Joi.number().positive()
            .messages({
                'number.positive': 'Le budget global doit être positif'
            })
    })
};

// Schémas de validation pour l'authentification
const authValidation = {
    login: Joi.object({
        email: Joi.string().required()
            .messages({
                'any.required': 'L\'identifiant (email ou login) est requis'
            }),
        password: Joi.string().required()
            .messages({
                'any.required': 'Le mot de passe est requis'
            })
    }),

    changePassword: Joi.object({
        currentPassword: Joi.string().required()
            .messages({
                'any.required': 'Le mot de passe actuel est requis'
            }),
        newPassword: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required()
            .messages({
                'string.min': 'Le nouveau mot de passe doit contenir au moins 8 caractères',
                'string.pattern.base': 'Le nouveau mot de passe doit contenir au moins une minuscule, une majuscule, un chiffre et un caractère spécial',
                'any.required': 'Le nouveau mot de passe est requis'
            })
    })
};

module.exports = {
    userValidation,
    businessUnitValidation,
    divisionValidation,
    clientValidation,
    contactValidation,
    fiscalYearValidation,
    authValidation
}; 