const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const apiLogger = require('../middleware/apiLogger');
const auditLogger = require('../middleware/auditLogger');

const purchaseController = require('../controllers/purchaseController');
const transferController = require('../controllers/transferController');
const assignmentController = require('../controllers/assignmentController');
const dashboardController = require('../controllers/dashboardController');
const referenceController = require('../controllers/referenceController');

// All business logic routes are protected and logged
router.use(verifyToken);
router.use(apiLogger);
router.use(auditLogger);

// References (Dropdowns, Inventory)
router.get('/bases', referenceController.getBases);
router.get('/equipment', referenceController.getEquipment);
router.get('/inventory', referenceController.getInventory);

// Purchases
router.post('/purchases', requireRole(['Admin', 'Base Commander']), purchaseController.createPurchase);
router.get('/purchases', purchaseController.getPurchases);

// Transfers
router.post('/transfers', transferController.createTransfer);
router.get('/transfers', transferController.getTransfers);

// Assignments
router.post('/assignments', assignmentController.createAssignment);
router.put('/assignments/:id', assignmentController.updateAssignmentStatus);
router.put('/assignments/:id/expend', assignmentController.markExpended);
router.put('/assignments/:id/return', assignmentController.returnToStock);
router.get('/assignments', assignmentController.getAssignments);

// Dashboard
router.get('/dashboard', dashboardController.getDashboardMetrics);
router.get('/dashboard/movement-details', dashboardController.getMovementDetails);

module.exports = router;
