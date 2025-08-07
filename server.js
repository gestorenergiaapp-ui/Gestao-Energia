const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();

// CORS configuration - more explicit to prevent fetch errors
const corsOptions = {
    origin: '*', // In production, restrict this to your frontend's domain e.g. 'https://myapp.com'
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204
};
app.use(cors(corsOptions));

// Simple logging middleware to see all incoming requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

app.use(express.json());

const PORT = process.env.PORT || 4000;
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error("Error: DATABASE_URL is not defined in .env file.");
    process.exit(1);
}

let db;

// --- Nodemailer Transporter ---
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});


// --- Database Connection ---
MongoClient.connect(DATABASE_URL)
    .then(async (client) => {
        console.log('Connected to MongoDB Atlas');
        db = client.db();
        
        const collections = ['users', 'contracts', 'units', 'competences', 'expenses', 'summaries'];
        for(const col of collections) {
            await db.collection(col).countDocuments();
        }
        
        // Seed default admin user if not exists
        const adminUser = await db.collection('users').findOne({ email: 'admin@example.com' });
        if (!adminUser) {
            const passwordHash = await bcrypt.hash('password123', 10);
            await db.collection('users').insertOne({
                name: 'Admin',
                email: 'admin@example.com',
                passwordHash,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log("Default admin user created.");
        }

        app.listen(PORT, () => {
            console.log(`Backend server running on port ${PORT}`);
        });
    })
    .catch(error => {
        console.error('Failed to connect to MongoDB', error);
        process.exit(1);
    });

// --- Test route to check if server is running ---
app.get('/', (req, res) => {
    res.json({ message: 'Backend server is running!' });
});

// --- API Routes ---
const api = express.Router();
app.use('/api', api);

// --- Auth Routes ---
api.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await db.collection('users').findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Credenciais inválidas' });
        }
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciais inválidas' });
        }
        // Don't send password hash to frontend
        const { passwordHash, ...userWithoutPassword } = user;
        res.json({ message: 'Login successful', user: userWithoutPassword, token: 'fake-jwt-token' });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

api.post('/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const existingUser = await db.collection('users').findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'O e-mail já está em uso.' });
        }
        const passwordHash = await bcrypt.hash(password, 10);
        const result = await db.collection('users').insertOne({
            name,
            email,
            passwordHash,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        const newUser = await db.collection('users').findOne({ _id: result.insertedId });
        const { passwordHash: _, ...userWithoutPassword } = newUser;
        res.status(201).json(userWithoutPassword);
    } catch(e) {
        res.status(500).json({ message: e.message });
    }
});

api.post('/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await db.collection('users').findOne({ email });
        if (user) {
            const tempPassword = Math.random().toString(36).slice(-8);
            const hashedTempPassword = await bcrypt.hash(tempPassword, 10);
            
            await db.collection('users').updateOne(
                { _id: user._id },
                { $set: { passwordHash: hashedTempPassword, updatedAt: new Date() } }
            );

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Sua Nova Senha Temporária - Gestor de Energia',
                text: `Olá ${user.name},\n\Sua senha foi redefinida. Sua nova senha temporária é: ${tempPassword}\n\nRecomendamos que você altere esta senha após fazer login.\n\nAtenciosamente,\nEquipe Gestor de Energia`
            };

            await transporter.sendMail(mailOptions);
        }
        // Always send a success message to prevent user enumeration
        res.json({ message: 'Se um usuário com este e-mail existir, uma nova senha foi enviada.' });

    } catch (e) {
        console.error("Forgot password error:", e);
        // Don't leak internal errors
        res.status(500).json({ message: 'Ocorreu um erro no servidor.' });
    }
});


// --- Generic CRUD ---
const createCrudEndpoints = (collectionName) => {
    api.get(`/${collectionName}`, async (req, res) => {
        try {
            const items = await db.collection(collectionName).find().toArray();
            res.json(items);
        } catch (e) { res.status(500).json({ message: e.message }); }
    });
    api.post(`/${collectionName}`, async (req, res) => {
        try {
            const result = await db.collection(collectionName).insertOne({ ...req.body, createdAt: new Date(), updatedAt: new Date() });
            const newItem = await db.collection(collectionName).findOne({ _id: result.insertedId });
            res.status(201).json(newItem);
        } catch (e) { res.status(500).json({ message: e.message }); }
    });
     api.put(`/${collectionName}/:id`, async (req, res) => {
        try {
            const { id } = req.params;
            const updateData = { ...req.body };
            delete updateData._id;
            const result = await db.collection(collectionName).updateOne(
                { _id: new ObjectId(id) },
                { $set: { ...updateData, updatedAt: new Date() } }
            );
            if (result.matchedCount === 0) return res.status(404).json({ message: 'Not found' });
            const updatedItem = await db.collection(collectionName).findOne({_id: new ObjectId(id)});
            res.json(updatedItem);
        } catch (e) { res.status(500).json({ message: e.message }); }
    });
    api.delete(`/${collectionName}/:id`, async (req, res) => {
        try {
            const { id } = req.params;
            if (collectionName === 'units') {
                await db.collection('expenses').deleteMany({ unidadeId: id });
            }
            const result = await db.collection(collectionName).deleteOne({ _id: new ObjectId(id) });
            if (result.deletedCount === 0) return res.status(404).json({ message: 'Not found' });
            res.status(204).send();
        } catch (e) { res.status(500).json({ message: e.message }); }
    });
};

createCrudEndpoints('contracts');
createCrudEndpoints('units');
createCrudEndpoints('competences');
createCrudEndpoints('summaries');

// Special endpoint for User update to avoid password issues
api.put('/users/:id', async (req, res) => {
     try {
        const { id } = req.params;
        const { name, email, currentPassword, newPassword } = req.body;
        
        const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const updateData = { name, email, updatedAt: new Date() };

        if (newPassword) {
            if (!currentPassword) {
                 return res.status(400).json({ message: 'Senha atual é obrigatória para definir uma nova.' });
            }
            const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
            if (!isMatch) {
                return res.status(400).json({ message: 'Senha atual incorreta.' });
            }
            updateData.passwordHash = await bcrypt.hash(newPassword, 10);
        }

        await db.collection('users').updateOne({ _id: new ObjectId(id) }, { $set: updateData });
        
        const updatedUser = await db.collection('users').findOne({_id: new ObjectId(id)});
        const { passwordHash, ...userWithoutPassword } = updatedUser;
        res.json(userWithoutPassword);
    } catch(e) {
        res.status(500).json({ message: e.message });
    }
});

// --- Complex Endpoints ---
api.get('/expenses', async (req, res) => {
    try {
        const { contratoId, marketType, unidadeId, competenciaId } = req.query;
        let unitQuery = {};
        if (contratoId) unitQuery.contratoId = contratoId;
        if (marketType) unitQuery.marketType = marketType;
        if (unidadeId) unitQuery._id = new ObjectId(unidadeId);
        
        const unitsInFilter = await db.collection('units').find(unitQuery).project({_id: 1}).toArray();
        const unitIdsInFilter = unitsInFilter.map(u => u._id.toString());

        let expenseQuery = { unidadeId: { $in: unitIdsInFilter } };
        
        if (competenciaId) {
             const allExpenses = await db.collection('expenses').find(expenseQuery).toArray();
             const allCompetences = await db.collection('competences').find().toArray();
             const targetComp = allCompetences.find(c => c._id.toString() === competenciaId);

             if (!targetComp) return res.json([]);

             const expenseBelongsToCompetence = (expense, competence) => {
                if (expense.tipoDespesa === "encargo") {
                    const vencimento = new Date(expense.vencimento);
                    return vencimento.getUTCFullYear() === competence.ano && (vencimento.getUTCMonth() + 1) === competence.mes;
                }
                return expense.competenciaId === competence._id.toString();
            };
            const filteredExpenses = allExpenses.filter(e => expenseBelongsToCompetence(e, targetComp));
            return res.json(filteredExpenses);
        }

        const expenses = await db.collection('expenses').find(expenseQuery).toArray();
        res.json(expenses);

    } catch(e) {
        res.status(500).json({ message: e.message });
    }
});
api.post('/expenses', async (req, res) => { // Manually create POST to avoid generic one
    try {
        const result = await db.collection('expenses').insertOne({ ...req.body, createdAt: new Date(), updatedAt: new Date() });
        const newItem = await db.collection('expenses').findOne({ _id: result.insertedId });
        res.status(201).json(newItem);
    } catch (e) { res.status(500).json({ message: e.message }); }
});


api.get('/dashboard', async (req, res) => {
    try {
        // This logic is complex and best handled by a proper aggregation pipeline in a real app.
        // For now, we fetch and filter in code.
        const { contratoId, marketType, unidadeId, competenciaId } = req.query;
        let unitQuery = {};
        if (contratoId) unitQuery.contratoId = contratoId;
        if (marketType) unitQuery.marketType = marketType;
        if (unidadeId) unitQuery._id = new ObjectId(unidadeId);

        const units = await db.collection('units').find(unitQuery).toArray();
        const unitIds = units.map(u => u._id.toString());
        
        const allExpensesForUnits = await db.collection('expenses').find({ unidadeId: { $in: unitIds } }).toArray();
        const allCompetences = await db.collection('competences').find({}).toArray();
        
        const summaryCollection = db.collection('summaries');
        const summaryDataArray = await summaryCollection.find({}).toArray();
        const summaryData = summaryDataArray.reduce((acc, item) => {
            if (!acc[item.unidadeId]) acc[item.unidadeId] = {};
            acc[item.unidadeId][item.competenciaId] = { livre: item.livre, cativo: item.cativo };
            return acc;
        }, {});


        let filteredExpenses = allExpensesForUnits;
        if (competenciaId) {
            const targetComp = allCompetences.find(c => c._id.toString() === competenciaId);
            if (targetComp) {
                 const expenseBelongsToCompetence = (expense, competence) => {
                    if (expense.tipoDespesa === "encargo") {
                        const vencimento = new Date(expense.vencimento);
                        return vencimento.getUTCFullYear() === competence.ano && (vencimento.getUTCMonth() + 1) === competence.mes;
                    }
                    return expense.competenciaId === competence._id.toString();
                };
                filteredExpenses = filteredExpenses.filter(e => expenseBelongsToCompetence(e, targetComp));
            } else {
                filteredExpenses = [];
            }
        }
        
        const totalDespesas = filteredExpenses.reduce((sum, e) => sum + e.valor, 0);

        const { totalEconomia } = filteredExpenses.reduce((acc, exp) => {
            const effectiveCompId = exp.tipoDespesa === 'encargo' 
                ? allCompetences.find(c => {
                    const venc = new Date(exp.vencimento);
                    return c.ano === venc.getUTCFullYear() && c.mes === (venc.getUTCMonth() + 1);
                })?._id.toString()
                : exp.competenciaId;
                
            if (effectiveCompId) {
                const summary = summaryData[exp.unidadeId]?.[effectiveCompId];
                 if(summary) {
                    // This is not quite right, economy should be calculated on totals not per-expense
                 }
            }
            return acc;
        }, { totalEconomia: 0 });

        const kpis = { totalDespesas, economia: totalEconomia }; // Placeholder for now

        const charts = {
            despesasPorTipo: Object.entries(filteredExpenses.reduce((acc, e) => {
                const typeLabel = e.tipoDespesa.charAt(0).toUpperCase() + e.tipoDespesa.slice(1);
                acc[typeLabel] = (acc[typeLabel] || 0) + e.valor;
                return acc;
            }, {})).map(([name, value]) => ({ name, value })),
            
            despesasPorUnidade: Object.entries(filteredExpenses.reduce((acc, e) => {
                const unitName = units.find(u => u._id.toString() === e.unidadeId)?.nome || 'Desconhecida';
                acc[unitName] = (acc[unitName] || 0) + e.valor;
                return acc;
            }, {})).map(([name, value]) => ({ name, value })),
            
            oportunidadesMelhora: Object.entries(filteredExpenses.reduce((acc, e) => {
                if (e.detalhesDistribuidora) {
                    acc['Multa Reativo'] = (acc['Multa Reativo'] || 0) + e.detalhesDistribuidora.reativoValor;
                    acc['Multa Demanda'] = (acc['Multa Demanda'] || 0) + e.detalhesDistribuidora.demandaUltrValor;
                }
                return acc;
            }, {})).map(([name, value]) => ({ name, value })).filter(item => item.value > 0),

            monthlyExpenses: [], // Requires aggregation
            mercadoComparison: [], // Requires aggregation
        };

        res.json({ kpis, charts });
    } catch(e) {
        res.status(500).json({ message: e.message });
    }
});


api.get('/units/details/:unitName', async (req, res) => {
    try {
        const { unitName } = req.params;
        const { competenciaId } = req.query; // And other filters
        
        const unit = await db.collection('units').findOne({ nome: unitName });
        if (!unit) return res.status(404).json({ message: 'Unit not found' });
        
        // This also needs to respect all filters from the dashboard
        let expenses = await db.collection('expenses').find({ unidadeId: unit._id.toString() }).toArray();
        // Add filtering logic here based on query params...

        const costComposition = expenses.reduce((acc, exp) => {
            acc[exp.tipoDespesa] = (acc[exp.tipoDespesa] || 0) + exp.valor;
            return acc;
        }, { comercializadora: 0, distribuidora: 0, encargo: 0 });

        const consumptionDetails = expenses.reduce((acc, exp) => {
            if (exp.detalhesDistribuidora) {
                acc.totalConsumoMWh += exp.detalhesDistribuidora.consumoMWh;
                acc.totalDemandaUltrKW += exp.detalhesDistribuidora.demandaUltrKW;
                acc.totalDemandaUltrValor += exp.detalhesDistribuidora.demandaUltrValor;
                acc.totalReativoKWh += exp.detalhesDistribuidora.reativoKWh;
                acc.totalReativoValor += exp.detalhesDistribuidora.reativoValor;
            }
            return acc;
        }, { totalConsumoMWh: 0, totalDemandaUltrKW: 0, totalDemandaUltrValor: 0, totalReativoKWh: 0, totalReativoValor: 0, totalMultas: 0 });
        
        consumptionDetails.totalMultas = consumptionDetails.totalDemandaUltrValor + consumptionDetails.totalReativoValor;

        res.json({ unitName, costComposition, consumptionDetails });
    } catch(e) {
        res.status(500).json({ message: e.message });
    }
});