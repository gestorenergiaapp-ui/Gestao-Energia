

const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors =require('cors');
const bcrypt = require('bcryptjs');
const emailjs = require('@emailjs/nodejs');
require('dotenv').config();

const app = express();

// --- Robust CORS Configuration ---
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [];

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests) or from whitelisted origins
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // Allow cookies to be sent
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
const {
    DATABASE_URL,
    EMAILJS_SERVICE_ID,
    EMAILJS_PUBLIC_KEY,
    EMAILJS_PRIVATE_KEY,
    EMAILJS_FORGOT_PASSWORD_TEMPLATE_ID,
    EMAILJS_REPORT_TEMPLATE_ID,
    APP_LOGO_URL,
} = process.env;


if (!DATABASE_URL) {
    console.error("Error: DATABASE_URL is not defined in .env file.");
    process.exit(1);
}
if (!EMAILJS_SERVICE_ID || !EMAILJS_PUBLIC_KEY || !EMAILJS_PRIVATE_KEY || !EMAILJS_FORGOT_PASSWORD_TEMPLATE_ID || !EMAILJS_REPORT_TEMPLATE_ID) {
    console.warn("Warning: EmailJS environment variables are not fully configured. Email features will not work.");
} else {
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}

const logoDataUriFallback = "data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23818cf8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpath d='M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z'%3e%3c/path%3e%3cpath d='m13 12-2 5h4l-2 5'%3e%3c/path%3e%3cpath d='M9 12a3 3 0 0 0 6 0c0-1.7-3-3-3-3s-3 1.3-3 3Z'%3e%3c/path%3e%3c/svg%3e";

let db;

// --- Helper function for logging actions ---
const logAction = async (actingUser, action, entity, description) => {
    try {
        if (!db || !actingUser || !actingUser._id) {
            console.warn("Audit log skipped: DB not ready or invalid user.");
            return;
        }
        await db.collection('audit_logs').insertOne({
            timestamp: new Date(),
            userId: actingUser._id,
            userName: actingUser.name,
            action, // e.g., 'CREATE', 'UPDATE', 'DELETE', 'LOGIN'
            entity, // e.g., 'Usuário', 'Unidade'
            description, // Human-readable description
        });
    } catch (error) {
        console.error("Failed to write to audit log:", error);
    }
};

// --- Helper Functions ---

// Returns a consistently shaped empty charts object for API responses.
const getEmptyChartsObject = () => ({
    despesasPorTipo: [],
    despesasPorUnidade: [],
    oportunidadesMelhora: [],
    monthlyExpenses: [],
    mercadoComparison: [],
});

// Determines if an expense belongs to a given competence, handling special logic for 'encargo'.
const expenseBelongsToCompetence = (expense, competence) => {
    // For 'encargo' type, competence is determined by the due date ('vencimento').
    if (expense.tipoDespesa === "encargo") {
        const vencimento = new Date(expense.vencimento);
        // Use UTC methods to prevent timezone-related errors.
        return vencimento.getUTCFullYear() === competence.ano && (vencimento.getUTCMonth() + 1) === competence.mes;
    }
    // For all other types, use the stored 'competenciaId'.
    return expense.competenciaId === competence._id.toString();
};


// --- Database Connection ---
MongoClient.connect(DATABASE_URL)
    .then(async (client) => {
        console.log('Connected to MongoDB Atlas');
        db = client.db();
        
        const collections = ['users', 'contracts', 'units', 'competences', 'expenses', 'estimates', 'audit_logs'];
        for(const col of collections) {
            // This ensures the collection exists, creating it if it doesn't.
            if (!(await db.listCollections({ name: col }).hasNext())) {
                 await db.createCollection(col);
                 console.log(`Collection '${col}' created.`);
            }
        }
        
        // Seed default admin user if not exists
        const adminUser = await db.collection('users').findOne({ email: 'admin@example.com' });
        if (!adminUser) {
            const passwordHash = await bcrypt.hash('password123', 10);
            await db.collection('users').insertOne({
                name: 'Admin',
                email: 'admin@example.com',
                passwordHash,
                role: 'admin',
                status: 'active',
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log("Default admin user created.");
        }

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Backend server running on port ${PORT} and accessible on your network.`);
        });
    })
    .catch(error => {
        console.error('Failed to connect to MongoDB', error);
        process.exit(1);
    });

// --- Middleware to check for active user on mutations (CUD) ---
const requireActiveUser = async (req, res, next) => {
    try {
        // userId can be in body for POST/PUT or query for DELETE
        const userId = req.body.userId || req.query.userId;
        if (!userId) {
            return res.status(401).json({ message: 'A autenticação do usuário é necessária.' });
        }
        if (!ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Formato de ID de usuário inválido.' });
        }
        const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
        if (!user) {
            return res.status(404).json({ message: 'Usuário da ação não encontrado.' });
        }
        if (user.status !== 'active') {
            // This specific error message will trigger a logout on the frontend
            return res.status(403).json({ message: 'Sua conta está inativa e não pode realizar esta ação.' });
        }
        // Attach user to request for subsequent handlers if needed
        req.actingUser = user;
        next();
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

// --- Helper to get user permissions for read operations ---
const getUserPermissions = async (userId) => {
    if (!userId || !ObjectId.isValid(userId)) {
        return { role: 'guest', accessibleUnitIds: [], status: 'inactive' };
    }
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) }, { projection: { role: 1, accessibleUnitIds: 1, status: 1 } });
    if (!user || user.status !== 'active') {
        return { role: 'guest', accessibleUnitIds: [], status: 'inactive' };
    }
    return user;
};


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
        if (user.status !== 'active') {
             if (user.status === 'pending') {
                 return res.status(403).json({ message: 'Sua conta está pendente de aprovação.' });
             }
             return res.status(403).json({ message: 'Sua conta está inativa. Contate um administrador.' });
        }
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciais inválidas' });
        }
        // Don't send password hash to frontend
        const { passwordHash, ...userWithoutPassword } = user;
        
        await logAction(user, 'LOGIN', 'Sistema', `Usuário '${user.name}' realizou login.`);
        
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
            role: 'user',
            status: 'pending',
            accessibleUnitIds: [], // Default to no units
            createdAt: new Date(),
            updatedAt: new Date()
        });
        const newUser = await db.collection('users').findOne({ _id: result.insertedId });
        const { passwordHash: _, ...userWithoutPassword } = newUser;

        const systemUser = { _id: 'system', name: 'Sistema' };
        await logAction(systemUser, 'CREATE', 'Usuário', `Nova solicitação de cadastro para o e-mail '${email}'.`);
        
        res.status(201).json(userWithoutPassword);
    } catch(e) {
        res.status(500).json({ message: e.message });
    }
});

api.post('/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!EMAILJS_SERVICE_ID || !EMAILJS_FORGOT_PASSWORD_TEMPLATE_ID) {
        return res.status(500).json({ message: 'Serviço de email não está configurado.' });
    }
    try {
        const user = await db.collection('users').findOne({ email });
        if (user) {
            if (!user.email) {
                 // Failsafe: if for some reason the user has no email, do not proceed.
                 throw new Error("User has no email address.");
            }
            const tempPassword = Math.random().toString(36).slice(-8);

            const templateParams = {
                to_email: user.email,
                user_name: user.name,
                temp_password: tempPassword,
                logo_url: APP_LOGO_URL || logoDataUriFallback,
            };
            
            await emailjs.send(
                EMAILJS_SERVICE_ID,
                EMAILJS_FORGOT_PASSWORD_TEMPLATE_ID,
                templateParams,
                { privateKey: EMAILJS_PRIVATE_KEY }
            );

            const hashedTempPassword = await bcrypt.hash(tempPassword, 10);
            await db.collection('users').updateOne(
                { _id: user._id },
                { $set: { passwordHash: hashedTempPassword, updatedAt: new Date() } }
            );

            await logAction({ _id: user._id, name: user.name }, 'UPDATE', 'Usuário', `Usuário '${user.name}' solicitou redefinição de senha.`);
        }

        res.json({ message: 'Se um usuário com este e-mail existir, uma nova senha foi enviada.' });

    } catch (e) {
        console.error("Forgot password error:", e);
        if (e && e.status === 403) {
            return res.status(500).json({ message: 'Falha no envio de e-mail. Verifique se a opção "API Calls" está ativada no seu serviço de e-mail no painel do EmailJS.' });
        }
        if (e && e.status === 422 && e.text?.includes('recipients address is empty')) {
             return res.status(500).json({ message: 'Falha no envio de e-mail. Configure a variável {{to_email}} no campo "To Email" do seu template no painel do EmailJS.' });
        }
        res.status(500).json({ message: 'Ocorreu um erro no servidor ao tentar enviar o e-mail.' });
    }
});

// --- Contracts ---
api.get(`/contracts`, async (req, res) => {
    try {
        const { userId } = req.query;
        const permissions = await getUserPermissions(userId);
        
        let query = {};
        if (permissions.role !== 'admin') {
            const accessibleIds = (permissions.accessibleUnitIds || []).map(id => new ObjectId(id));
            if(accessibleIds.length === 0){
                return res.json([]);
            }
            const accessibleUnits = await db.collection('units').find({ _id: { $in: accessibleIds } }).project({ contratoId: 1 }).toArray();
            const contractIds = [...new Set(accessibleUnits.map(u => new ObjectId(u.contratoId)))];
            query._id = { $in: contractIds };
        }
        
        const items = await db.collection('contracts').find(query).toArray();
        res.json(items);
    } catch (e) { res.status(500).json({ message: e.message }); }
});
api.post(`/contracts`, requireActiveUser, async (req, res) => {
    try {
        const { userId, ...data } = req.body;
        const result = await db.collection('contracts').insertOne({ ...data, createdAt: new Date(), updatedAt: new Date() });
        const newItem = await db.collection('contracts').findOne({ _id: result.insertedId });
        await logAction(req.actingUser, 'CREATE', 'Contrato', `Criou o contrato '${newItem.nome}'.`);
        res.status(201).json(newItem);
    } catch (e) { res.status(403).json({ message: e.message }); }
});
api.put(`/contracts/:id`, requireActiveUser, async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid ID format' });
        const { userId, ...updateData } = req.body;
        delete updateData._id;
        const originalItem = await db.collection('contracts').findOne({ _id: new ObjectId(id) });
        const result = await db.collection('contracts').updateOne(
            { _id: new ObjectId(id) },
            { $set: { ...updateData, updatedAt: new Date() } }
        );
        if (result.matchedCount === 0) return res.status(404).json({ message: 'Not found' });
        const updatedItem = await db.collection('contracts').findOne({_id: new ObjectId(id)});
        await logAction(req.actingUser, 'UPDATE', 'Contrato', `Atualizou o contrato '${originalItem.nome}' para '${updatedItem.nome}'.`);
        res.json(updatedItem);
    } catch (e) { res.status(403).json({ message: e.message }); }
});
api.delete(`/contracts/:id`, requireActiveUser, async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid ID format' });
        const itemToDelete = await db.collection('contracts').findOne({ _id: new ObjectId(id) });
        await db.collection('units').updateMany({ contratoId: id }, { $set: { contratoId: null }});
        const result = await db.collection('contracts').deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) return res.status(404).json({ message: 'Not found' });
        await logAction(req.actingUser, 'DELETE', 'Contrato', `Excluiu o contrato '${itemToDelete.nome}'.`);
        res.status(204).send();
    } catch (e) { res.status(403).json({ message: e.message }); }
});

// --- Units ---
api.get(`/units`, async (req, res) => {
    try {
        const { userId } = req.query;
        const permissions = await getUserPermissions(userId);

        let query = {};
        if (permissions.role !== 'admin') {
            const accessibleIds = (permissions.accessibleUnitIds || []).map(id => new ObjectId(id));
            query._id = { $in: accessibleIds };
        }

        const items = await db.collection('units').find(query).toArray();
        res.json(items);
    } catch (e) { res.status(500).json({ message: e.message }); }
});
api.post(`/units`, requireActiveUser, async (req, res) => {
    try {
        const { userId, ...data } = req.body;
        const result = await db.collection('units').insertOne({ ...data, createdAt: new Date(), updatedAt: new Date() });
        const newItem = await db.collection('units').findOne({ _id: result.insertedId });
        await logAction(req.actingUser, 'CREATE', 'Unidade', `Criou a unidade '${newItem.nome}'.`);
        res.status(201).json(newItem);
    } catch (e) { res.status(403).json({ message: e.message }); }
});
api.put(`/units/:id`, requireActiveUser, async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid ID format' });
        const { userId, ...updateData } = req.body;
        delete updateData._id;
        const originalItem = await db.collection('units').findOne({ _id: new ObjectId(id) });
        const result = await db.collection('units').updateOne(
            { _id: new ObjectId(id) },
            { $set: { ...updateData, updatedAt: new Date() } }
        );
        if (result.matchedCount === 0) return res.status(404).json({ message: 'Not found' });
        const updatedItem = await db.collection('units').findOne({_id: new ObjectId(id)});
        await logAction(req.actingUser, 'UPDATE', 'Unidade', `Atualizou a unidade '${originalItem.nome}' para '${updatedItem.nome}'.`);
        res.json(updatedItem);
    } catch (e) { res.status(403).json({ message: e.message }); }
});
api.delete(`/units/:id`, requireActiveUser, async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid ID format' });
        const itemToDelete = await db.collection('units').findOne({ _id: new ObjectId(id) });
        await db.collection('expenses').deleteMany({ unidadeId: id });
        const result = await db.collection('units').deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) return res.status(404).json({ message: 'Not found' });
        await logAction(req.actingUser, 'DELETE', 'Unidade', `Excluiu a unidade '${itemToDelete.nome}'.`);
        res.status(204).send();
    } catch (e) { res.status(403).json({ message: e.message }); }
});


// --- Competences ---
api.get(`/competences`, async (req, res) => {
    try {
        const items = await db.collection('competences').find().sort({ ano: -1, mes: -1 }).toArray();
        res.json(items);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

api.post(`/competences`, requireActiveUser, async (req, res) => {
    try {
        const { userId, ...data } = req.body;
        const { ano, mes } = data;

        if (!ano || !mes) {
            return res.status(400).json({ message: 'Ano e Mês são obrigatórios.' });
        }
        const existing = await db.collection('competences').findOne({ ano: Number(ano), mes: Number(mes) });
        if (existing) {
            return res.status(400).json({ message: 'Esta competência já existe.' });
        }
        const result = await db.collection('competences').insertOne({ ano: Number(ano), mes: Number(mes), createdAt: new Date() });
        const newItem = await db.collection('competences').findOne({ _id: result.insertedId });
        const competenceLabel = `${String(newItem.mes).padStart(2,'0')}/${newItem.ano}`;
        await logAction(req.actingUser, 'CREATE', 'Competência', `Criou a competência '${competenceLabel}'.`);
        res.status(201).json(newItem);
    } catch (e) { res.status(403).json({ message: e.message }); }
});

api.delete(`/competences/:id`, requireActiveUser, async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid ID format' });
        const itemToDelete = await db.collection('competences').findOne({ _id: new ObjectId(id) });
        const expenseCount = await db.collection('expenses').countDocuments({ competenciaId: id });
        if (expenseCount > 0) {
            return res.status(400).json({ message: 'Não é possível excluir. Existem despesas associadas a esta competência.' });
        }
        const result = await db.collection('competences').deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) return res.status(404).json({ message: 'Competência não encontrada.' });
        const competenceLabel = `${String(itemToDelete.mes).padStart(2,'0')}/${itemToDelete.ano}`;
        await logAction(req.actingUser, 'DELETE', 'Competência', `Excluiu a competência '${competenceLabel}'.`);
        res.status(204).send();
    } catch (e) { res.status(403).json({ message: e.message }); }
});


// --- User Management Routes ---
api.get('/users', async (req, res) => {
    try {
        // This should be admin-only, but let's assume frontend handles it
        const users = await db.collection('users').find({}, { projection: { passwordHash: 0 } }).toArray();
        res.json(users);
    } catch(e) {
        res.status(500).json({ message: e.message });
    }
});


api.put('/users/:id', requireActiveUser, async (req, res) => {
     try {
        const { id } = req.params;
        const { name, email, currentPassword, newPassword } = req.body;
        
        if (!ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid user ID format' });
        const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const updateData = { name, email, updatedAt: new Date() };
        let logDescription = `Atualizou o perfil do usuário '${user.name}'.`;

        if (newPassword) {
            if (!currentPassword) {
                 return res.status(400).json({ message: 'Senha atual é obrigatória para definir uma nova.' });
            }
            const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
            if (!isMatch) {
                return res.status(400).json({ message: 'Senha atual incorreta.' });
            }
            updateData.passwordHash = await bcrypt.hash(newPassword, 10);
            logDescription += ` Senha foi alterada.`
        }

        await db.collection('users').updateOne({ _id: new ObjectId(id) }, { $set: updateData });
        
        await logAction(req.actingUser, 'UPDATE', 'Usuário', logDescription);
        
        const updatedUser = await db.collection('users').findOne({_id: new ObjectId(id)});
        const { passwordHash, ...userWithoutPassword } = updatedUser;
        res.json(userWithoutPassword);
    } catch(e) {
        res.status(403).json({ message: e.message });
    }
});


api.put('/users/:id/status', requireActiveUser, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid user ID format' });
        if (!['active', 'inactive', 'pending'].includes(status)) return res.status(400).json({ message: 'Invalid status' });

        const userToUpdate = await db.collection('users').findOne({ _id: new ObjectId(id) });
        if (!userToUpdate) return res.status(404).json({ message: 'User not found' });
        
        const result = await db.collection('users').updateOne(
            { _id: new ObjectId(id) },
            { $set: { status: status, updatedAt: new Date() } }
        );

        if (result.matchedCount === 0) return res.status(404).json({ message: 'User not found' });
        await logAction(req.actingUser, 'UPDATE', 'Usuário', `Atualizou o status de '${userToUpdate.name}' para '${status}'.`);
        res.status(200).json({ message: 'User status updated successfully' });
    } catch(e) {
        res.status(403).json({ message: e.message });
    }
});

api.put('/users/:id/role', requireActiveUser, async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid user ID format' });
        if (!['admin', 'gestor', 'user'].includes(role)) return res.status(400).json({ message: 'Invalid role' });
        
        const userToUpdate = await db.collection('users').findOne({ _id: new ObjectId(id) });
        if (!userToUpdate) return res.status(404).json({ message: 'User not found' });
        if (userToUpdate.email === 'admin@example.com') {
            return res.status(403).json({ message: "O perfil do administrador principal não pode ser alterado."});
        }

        const result = await db.collection('users').updateOne(
            { _id: new ObjectId(id) },
            { $set: { role: role, updatedAt: new Date() } }
        );

        if (result.matchedCount === 0) return res.status(404).json({ message: 'User not found' });
        await logAction(req.actingUser, 'UPDATE', 'Usuário', `Alterou o perfil de '${userToUpdate.name}' para '${role}'.`);
        res.status(200).json({ message: 'User role updated successfully' });
    } catch(e) {
        res.status(403).json({ message: e.message });
    }
});

api.put('/users/:id/units', requireActiveUser, async (req, res) => {
    try {
        const { id } = req.params; // User to be updated
        const { unitIds } = req.body; // Array of unit IDs

        if (!ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid user ID format' });
        if (!Array.isArray(unitIds)) return res.status(400).json({ message: 'unitIds must be an array' });
        
        const userToUpdate = await db.collection('users').findOne({ _id: new ObjectId(id) });
        if (!userToUpdate) return res.status(404).json({ message: 'User not found' });

        const result = await db.collection('users').updateOne(
            { _id: new ObjectId(id) },
            { $set: { accessibleUnitIds: unitIds, updatedAt: new Date() } }
        );

        if (result.matchedCount === 0) return res.status(404).json({ message: 'User not found' });
        await logAction(req.actingUser, 'UPDATE', 'Usuário', `Atualizou as permissões de unidade para '${userToUpdate.name}'.`);
        res.status(200).json({ message: 'User unit access updated successfully' });
    } catch(e) {
        res.status(403).json({ message: e.message });
    }
});

api.delete('/users/:id', requireActiveUser, async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid user ID format' });
        
        const userToDelete = await db.collection('users').findOne({ _id: new ObjectId(id) });
        if (!userToDelete) return res.status(404).json({ message: 'User not found' });
        if (userToDelete.email === 'admin@example.com') {
            return res.status(403).json({ message: "O administrador principal não pode ser excluído."});
        }

        const result = await db.collection('users').deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) return res.status(404).json({ message: 'User not found' });

        await logAction(req.actingUser, 'DELETE', 'Usuário', `Excluiu o usuário '${userToDelete.name}' (${userToDelete.email}).`);
        res.status(204).send();
    } catch(e) {
        res.status(403).json({ message: e.message });
    }
});


// --- HELPER for Expenses ---
const getOrCreateCompetence = async (competenceString, actingUser) => {
    const [year, month] = competenceString.split('-').map(Number);
    if (!year || !month) {
        throw new Error('Formato de competência inválido. Use AAAA-MM.');
    }

    let competence = await db.collection('competences').findOne({ ano: year, mes: month });

    if (!competence) {
        const result = await db.collection('competences').insertOne({ ano: year, mes: month, createdAt: new Date() });
        competence = await db.collection('competences').findOne({ _id: result.insertedId });
        const competenceLabel = `${String(competence.mes).padStart(2,'0')}/${competence.ano}`;
        await logAction(actingUser, 'CREATE', 'Competência', `Criou a competência '${competenceLabel}' (automaticamente).`);
    }
    return competence;
}


// --- Complex Endpoints ---
api.get('/estimates', async (req, res) => {
    try {
        const { competenciaId } = req.query;
        if (!competenciaId) {
            return res.status(400).json({ message: 'Competence ID is required' });
        }
        const estimates = await db.collection('estimates').find({ competenciaId }).toArray();
        res.json(estimates);
    } catch(e) {
        res.status(500).json({ message: e.message });
    }
});

api.post('/estimates', requireActiveUser, async (req, res) => {
    try {
        const { competenciaId, estimates } = req.body;
        
        if (!competenciaId || !estimates) {
            return res.status(400).json({ message: 'competenciaId and estimates are required.' });
        }
    
        const bulkOps = estimates.map(est => ({
            updateOne: {
                filter: { unidadeId: est.unidadeId, competenciaId },
                update: { $set: { valor: est.valor, updatedAt: new Date() } },
                upsert: true,
            }
        }));

        if (bulkOps.length > 0) {
            await db.collection('estimates').bulkWrite(bulkOps);
        }
        
        const comp = await db.collection('competences').findOne({ _id: new ObjectId(competenciaId) });
        const compLabel = comp ? `${String(comp.mes).padStart(2,'0')}/${comp.ano}` : competenciaId;
        await logAction(req.actingUser, 'UPDATE', 'Estimativa', `Salvou estimativas para a competência ${compLabel}.`);

        res.status(200).json({ message: 'Estimates saved successfully' });
    } catch (e) {
        console.error("Error saving estimates:", e);
        res.status(403).json({ message: e.message });
    }
});


api.get('/expenses', async (req, res) => {
    try {
        const { contratoId, marketType, unidadeId, competenciaId, userId } = req.query;
        const permissions = await getUserPermissions(userId);

        if(permissions.status !== 'active') return res.json([]);
        
        let unitQuery = {};
        if (contratoId) unitQuery.contratoId = contratoId;
        if (marketType) unitQuery.marketType = marketType;
        if (unidadeId) {
            if (!ObjectId.isValid(unidadeId)) return res.status(400).json({ message: 'Invalid unidadeId format' });
            unitQuery._id = new ObjectId(unidadeId);
        }
        
        // --- Apply Permissions ---
        if (permissions.role !== 'admin') {
            const accessibleIds = (permissions.accessibleUnitIds || []).map(id => new ObjectId(id));
             if (unitQuery._id) { // a specific unit is already queried
                 if (!accessibleIds.find(id => id.equals(unitQuery._id))) {
                     return res.json([]); // User is trying to access a restricted unit
                 }
            } else {
                unitQuery._id = { ...unitQuery._id, $in: accessibleIds };
            }
        }
        
        const unitsInFilter = await db.collection('units').find(unitQuery).project({_id: 1}).toArray();
        const unitIdsInFilter = unitsInFilter.map(u => u._id.toString());
        
        if(unitIdsInFilter.length === 0) return res.json([]);

        let expenseQuery = { unidadeId: { $in: unitIdsInFilter } };
        
        if (competenciaId) {
             if (!ObjectId.isValid(competenciaId)) return res.status(400).json({ message: 'Invalid competenciaId format' });
             const allExpenses = await db.collection('expenses').find(expenseQuery).toArray();
             const allCompetences = await db.collection('competences').find().toArray();
             const targetComp = allCompetences.find(c => c._id.toString() === competenciaId);

             if (!targetComp) return res.json([]);

             const filteredExpenses = allExpenses.filter(e => expenseBelongsToCompetence(e, targetComp));
             return res.json(filteredExpenses);
        }

        const expenses = await db.collection('expenses').find(expenseQuery).toArray();
        res.json(expenses);

    } catch(e) {
        res.status(500).json({ message: e.message });
    }
});

api.post('/expenses', requireActiveUser, async (req, res) => {
    try {
        const { competencia, ...restOfBody } = req.body;
        
        if (!competencia) {
            return res.status(400).json({ message: 'O campo Competência é obrigatório.' });
        }

        const competenceDoc = await getOrCreateCompetence(competencia, req.actingUser);
        if (!competenceDoc) {
             return res.status(400).json({ message: 'Competência inválida ou não pôde ser criada.' });
        }

        const dataToInsert = { 
            ...restOfBody, 
            competenciaId: competenceDoc._id.toString(), 
            createdAt: new Date(), 
            updatedAt: new Date() 
        };
        delete dataToInsert.userId;

        const result = await db.collection('expenses').insertOne(dataToInsert);
        const newItem = await db.collection('expenses').findOne({ _id: result.insertedId });
        
        const unit = await db.collection('units').findOne({ _id: new ObjectId(newItem.unidadeId) });
        await logAction(req.actingUser, 'CREATE', 'Despesa', `Criou uma despesa de R$ ${newItem.valor} para a unidade '${unit.nome}'.`);
        
        res.status(201).json(newItem);
    } catch (e) {
        console.error("Error creating expense:", e);
        res.status(403).json({ message: e.message });
    }
});

api.put('/expenses/:id', requireActiveUser, async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid expense ID format' });

        const { competencia, ...restOfBody } = req.body;
        delete restOfBody._id;
        delete restOfBody.userId;


        if (!competencia) {
            return res.status(400).json({ message: 'O campo Competência é obrigatório.' });
        }
        
        const competenceDoc = await getOrCreateCompetence(competencia, req.actingUser);
        if (!competenceDoc) {
             return res.status(400).json({ message: 'Competência inválida ou não pôde ser criada.' });
        }
        
        const updateData = { 
            ...restOfBody,
            competenciaId: competenceDoc._id.toString(),
            updatedAt: new Date() 
        };

        const result = await db.collection('expenses').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );
        if (result.matchedCount === 0) return res.status(404).json({ message: 'Not found' });
        const updatedItem = await db.collection('expenses').findOne({_id: new ObjectId(id)});
        
        const unit = await db.collection('units').findOne({ _id: new ObjectId(updatedItem.unidadeId) });
        await logAction(req.actingUser, 'UPDATE', 'Despesa', `Atualizou a despesa (ID: ${id}) para a unidade '${unit.nome}'.`);
        
        res.json(updatedItem);
    } catch (e) {
         console.error("Error updating expense:", e);
        res.status(403).json({ message: e.message });
    }
});


api.delete('/expenses/:id', requireActiveUser, async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid ID format' });
        const expenseToDelete = await db.collection('expenses').findOne({ _id: new ObjectId(id) });
        if (!expenseToDelete) return res.status(404).json({ message: 'Not found' });
        
        const unit = await db.collection('units').findOne({ _id: new ObjectId(expenseToDelete.unidadeId) });

        const result = await db.collection('expenses').deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) return res.status(404).json({ message: 'Not found' });
        
        await logAction(req.actingUser, 'DELETE', 'Despesa', `Excluiu a despesa (ID: ${id}, Valor: R$ ${expenseToDelete.valor}) da unidade '${unit.nome}'.`);
        
        res.status(204).send();
    } catch (e) { res.status(403).json({ message: e.message }); }
});


api.get('/dashboard', async (req, res) => {
    try {
        const { contratoId, marketType, unidadeId, competenciaId, userId } = req.query;
        const permissions = await getUserPermissions(userId);

        if(permissions.status !== 'active') return res.json({ kpis: { totalDespesas: 0, economia: 0 }, charts: getEmptyChartsObject() });

        let unitQuery = {};
        if (contratoId) unitQuery.contratoId = contratoId;
        if (marketType) unitQuery.marketType = marketType;
        if (unidadeId) {
             if (!ObjectId.isValid(unidadeId)) return res.status(400).json({ message: 'Invalid unidadeId format' });
            unitQuery._id = new ObjectId(unidadeId);
        }
        
        // --- Apply Permissions ---
        if (permissions.role !== 'admin') {
            const accessibleIds = (permissions.accessibleUnitIds || []).map(id => new ObjectId(id));
             if (unitQuery._id) { // a specific unit is already queried
                 if (!accessibleIds.find(id => id.equals(unitQuery._id))) {
                     // User is trying to access a restricted unit
                     return res.json({ kpis: { totalDespesas: 0, economia: 0 }, charts: getEmptyChartsObject() });
                 }
            } else {
                unitQuery['_id'] = { ...unitQuery._id, $in: accessibleIds };
            }
        }

        const units = await db.collection('units').find(unitQuery).toArray();
        if(units.length === 0) return res.json({ kpis: { totalDespesas: 0, economia: 0 }, charts: getEmptyChartsObject() });

        const unitIds = units.map(u => u._id.toString());
        
        const allExpensesForUnits = await db.collection('expenses').find({ unidadeId: { $in: unitIds } }).toArray();
        const allCompetences = await db.collection('competences').find({}).toArray();
        
        const allEstimates = await db.collection('estimates').find({}).toArray();

        let filteredExpenses = allExpensesForUnits;
        if (competenciaId) {
            if (!ObjectId.isValid(competenciaId)) return res.status(400).json({ message: 'Invalid competenciaId format' });
            const targetComp = allCompetences.find(c => c._id.toString() === competenciaId);
            if (targetComp) {
                filteredExpenses = filteredExpenses.filter(e => expenseBelongsToCompetence(e, targetComp));
            } else {
                filteredExpenses = [];
            }
        }
        
        const totalDespesas = filteredExpenses.reduce((sum, e) => sum + e.valor, 0);

        const totalsByGroup = {};
        for (const expense of allExpensesForUnits) { // Use all expenses for accurate accumulation
            const unit = units.find(u => u._id.toString() === expense.unidadeId);
            if (!unit || unit.marketType !== 'livre') continue;

            const effectiveCompId = expense.tipoDespesa === 'encargo'
                ? (allCompetences.find(c => {
                    const venc = new Date(expense.vencimento);
                    return c.ano === venc.getUTCFullYear() && c.mes === (venc.getUTCMonth() + 1);
                })?._id.toString() || expense.competenciaId)
                : expense.competenciaId;
            
            const groupKey = `${expense.unidadeId}-${effectiveCompId}`;
            
            if (!totalsByGroup[groupKey]) {
                const estimateDoc = allEstimates.find(est => est.unidadeId === expense.unidadeId && est.competenciaId === effectiveCompId);
                totalsByGroup[groupKey] = {
                    real: 0,
                    estimado: estimateDoc ? estimateDoc.valor : 0
                };
            }
            totalsByGroup[groupKey].real += expense.valor;
        }

        let totalEconomia = 0;
        // Calculate total economy based on the filtered expenses
        for (const expense of filteredExpenses) {
            const unit = units.find(u => u._id.toString() === expense.unidadeId);
            if (!unit || unit.marketType !== 'livre') continue;

             const effectiveCompId = expense.tipoDespesa === 'encargo'
                ? (allCompetences.find(c => {
                    const venc = new Date(expense.vencimento);
                    return c.ano === venc.getUTCFullYear() && c.mes === (venc.getUTCMonth() + 1);
                })?._id.toString() || expense.competenciaId)
                : expense.competenciaId;
            
            const groupKey = `${expense.unidadeId}-${effectiveCompId}`;
            if (totalsByGroup[groupKey] && !totalsByGroup[groupKey].counted) {
                 if (totalsByGroup[groupKey].estimado > 0) {
                    totalEconomia += (totalsByGroup[groupKey].estimado - totalsByGroup[groupKey].real);
                }
                totalsByGroup[groupKey].counted = true; // Mark as counted to avoid double counting
            }
        }


        const kpis = { totalDespesas, economia: totalEconomia };

        const monthlyExpensesMap = {};
        for (const expense of filteredExpenses) {
            const effectiveCompId = expense.tipoDespesa === 'encargo'
                ? (allCompetences.find(c => {
                    const venc = new Date(expense.vencimento);
                    return c.ano === venc.getUTCFullYear() && c.mes === (venc.getUTCMonth() + 1);
                })?._id.toString() || expense.competenciaId)
                : expense.competenciaId;
            const comp = allCompetences.find(c => c._id.toString() === effectiveCompId);
            if (!comp) continue;
            const monthName = `${String(comp.mes).padStart(2, '0')}/${comp.ano}`;
            monthlyExpensesMap[monthName] = (monthlyExpensesMap[monthName] || 0) + expense.valor;
        }
        
        const monthlyExpenses = Object.entries(monthlyExpensesMap)
            .map(([name, value]) => ({ name, 'Valor (R$)': value }))
            .sort((a, b) => {
                const [aMes, aAno] = a.name.split('/');
                const [bMes, bAno] = b.name.split('/');
                return parseInt(aAno) - parseInt(bAno) || parseInt(aMes) - parseInt(bMes);
            });
        
        let mercadoComparison;
        if (competenciaId) {
            // When a specific competence is filtered, show breakdown by unit
            mercadoComparison = Object.entries(totalsByGroup)
                .filter(([key, value]) => {
                    const compId = key.split('-')[1];
                    return compId === competenciaId && value.estimado > 0;
                })
                .map(([key, group]) => {
                    const unitId = key.split('-')[0];
                    const unit = units.find(u => u._id.toString() === unitId);
                    return {
                        name: unit ? unit.nome : 'N/A', // Just the unit name
                        'Custo Real': group.real,
                        'Custo Estimado': group.estimado,
                    };
                })
                .sort((a, b) => (b['Custo Estimado'] - b['Custo Real']) - (a['Custo Estimado'] - a['Custo Real'])); // Sort by biggest economy
        } else {
            // When no competence is filtered, show accumulated totals per unit.
            const accumulatedByUnit = {};

            for (const key in totalsByGroup) {
                const [unitId] = key.split('-');
                const group = totalsByGroup[key];
                
                if (!accumulatedByUnit[unitId]) {
                    const unit = units.find(u => u._id.toString() === unitId);
                    accumulatedByUnit[unitId] = {
                        name: unit ? unit.nome : 'N/A',
                        'Custo Real': 0,
                        'Custo Estimado': 0,
                    };
                }
                
                accumulatedByUnit[unitId]['Custo Real'] += group.real;
                accumulatedByUnit[unitId]['Custo Estimado'] += group.estimado;
            }
            
            mercadoComparison = Object.values(accumulatedByUnit)
                .filter(item => item['Custo Estimado'] > 0) // Only show units that have estimates
                .sort((a, b) => (b['Custo Estimado'] - b['Custo Real']) - (a['Custo Estimado'] - a['Custo Real'])); // Sort by biggest economy
        }


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

            monthlyExpenses: monthlyExpenses,
            mercadoComparison: mercadoComparison,
        };
        
        // Clean up the temporary 'counted' property before sending
        Object.values(totalsByGroup).forEach(group => delete group.counted);

        res.json({ kpis, charts, rawData: { totalsByGroup } });
    } catch(e) {
        console.error("Dashboard endpoint error:", e);
        res.status(500).json({ message: e.message });
    }
});


api.get('/units/details/:unitName', async (req, res) => {
    try {
        const { unitName } = req.params;
        const { competenciaId, userId } = req.query;
        const permissions = await getUserPermissions(userId);

        if(permissions.status !== 'active') return res.status(404).json({ message: 'Unit not found' });
        
        const unit = await db.collection('units').findOne({ nome: unitName });
        if (!unit) return res.status(404).json({ message: 'Unit not found' });

        // --- Apply Permissions ---
        if (permissions.role !== 'admin') {
            const isAllowed = (permissions.accessibleUnitIds || []).includes(unit._id.toString());
            if (!isAllowed) {
                return res.status(403).json({ message: 'Access to this unit is denied' });
            }
        }
        
        let expenseQuery = { unidadeId: unit._id.toString() };

        let expenses = await db.collection('expenses').find(expenseQuery).toArray();

        if (competenciaId) {
            if (!ObjectId.isValid(competenciaId)) return res.status(400).json({ message: 'Invalid competenciaId format' });
            const allCompetences = await db.collection('competences').find({}).toArray();
            const targetComp = allCompetences.find(c => c._id.toString() === competenciaId);
            if (targetComp) {
                expenses = expenses.filter(e => expenseBelongsToCompetence(e, targetComp));
            } else {
                expenses = [];
            }
        }
        
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
        console.error("Unit details error:", e);
        res.status(500).json({ message: e.message });
    }
});


api.post('/reports/generate', requireActiveUser, async (req, res) => {
    try {
        const { competenciaId, emails, contratoId } = req.body;
        
        if (!EMAILJS_SERVICE_ID || !EMAILJS_REPORT_TEMPLATE_ID) {
            return res.status(500).json({ message: 'Serviço de email não está configurado.' });
        }
        if (!competenciaId || !emails || !emails.length) {
            return res.status(400).json({ message: 'Competência e e-mails são obrigatórios.' });
        }

        const competence = await db.collection('competences').findOne({ _id: new ObjectId(competenciaId) });
        if (!competence) {
            return res.status(404).json({ message: 'Competência não encontrada.' });
        }
        const competenceLabel = `${String(competence.mes).padStart(2, '0')}/${competence.ano}`;
        
        const { kpis, analysisPerUnit, penalties } = await getDashboardDataForReport(competenciaId, contratoId, req.actingUser);
        
        const htmlBody = buildHtmlReport(competenceLabel, kpis, { analysisPerUnit, penalties });
        const subject = `Relatório de Custos de Energia - Competência ${competenceLabel}`;

        for (const email of emails) {
             if (!email) continue; // Skip empty email addresses
             const templateParams = {
                to_email: email,
                subject: subject,
                html_body: htmlBody
            };
            await emailjs.send(
                EMAILJS_SERVICE_ID,
                EMAILJS_REPORT_TEMPLATE_ID,
                templateParams,
                { privateKey: EMAILJS_PRIVATE_KEY }
            );
        }
        
        await logAction(req.actingUser, 'CREATE', 'Relatório', `Gerou e enviou o relatório da competência ${competenceLabel} para ${emails.join(', ')}.`);
        res.status(200).json({ message: 'Relatório enviado com sucesso!' });

    } catch (e) {
        console.error("Error generating report:", e);
        if (e && e.status === 403) {
            return res.status(500).json({ message: 'Falha no envio de e-mail. Verifique se a opção "API Calls" está ativada no seu serviço de e-mail no painel do EmailJS.' });
        }
        if (e && e.status === 422 && e.text?.includes('recipients address is empty')) {
             return res.status(500).json({ message: 'Falha no envio de e-mail. Configure a variável {{to_email}} no campo "To Email" do seu template no painel do EmailJS.' });
        }
        res.status(500).json({ message: 'Ocorreu um erro ao gerar e enviar o relatório.' });
    }
});

// --- Audit Log Route ---
api.get('/audit-logs', async (req, res) => {
    try {
        const { userId, page = '1', limit = '15' } = req.query;
        
        const permissions = await getUserPermissions(userId);
        if (permissions.role !== 'admin') {
            return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem ver os logs.' });
        }

        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;

        const pipeline = [
            { $sort: { timestamp: -1 } },
            { $facet: {
                logs: [
                    { $skip: skip },
                    { $limit: limitNum },
                    { $project: { userId: 0 } } // Don't expose user ID
                ],
                totalCount: [
                    { $count: 'count' }
                ]
            }}
        ];

        const result = await db.collection('audit_logs').aggregate(pipeline).toArray();
        const logs = result[0].logs;
        const totalLogs = result[0].totalCount[0] ? result[0].totalCount[0].count : 0;
        const totalPages = Math.ceil(totalLogs / limitNum);

        res.json({
            logs,
            totalLogs,
            totalPages,
            currentPage: pageNum,
        });

    } catch (e) {
        console.error("Audit log endpoint error:", e);
        res.status(500).json({ message: e.message });
    }
});


// Helper function to get dashboard data, avoiding code duplication
async function getDashboardDataForReport(competenciaId, contratoId, actingUser) {
    const unitQuery = {};
    if (contratoId) {
        unitQuery.contratoId = contratoId;
    }
     // --- Apply Permissions ---
    if (actingUser.role !== 'admin') {
        const accessibleIds = (actingUser.accessibleUnitIds || []).map(id => new ObjectId(id));
        unitQuery['_id'] = { $in: accessibleIds };
    }

    const units = await db.collection('units').find(unitQuery).toArray();
    if(units.length === 0) {
        return { kpis: { totalDespesas: 0, economia: 0, totalUnidades: 0 }, analysisPerUnit: [], penalties: [] };
    }

    const unitIds = units.map(u => u._id.toString());
    const allCompetences = await db.collection('competences').find({}).toArray();
    const allEstimates = await db.collection('estimates').find({ competenciaId: competenciaId }).toArray();
    
    let allExpenses = await db.collection('expenses').find({ unidadeId: { $in: unitIds } }).toArray();

    const targetComp = allCompetences.find(c => c._id.toString() === competenciaId);
    if (!targetComp) throw new Error("Competence not found for report");
    
    const filteredExpenses = allExpenses.filter(e => expenseBelongsToCompetence(e, targetComp));

    const totalDespesas = filteredExpenses.reduce((sum, e) => sum + e.valor, 0);

    const totalsByUnit = {};
    const penalties = [];

    for (const expense of filteredExpenses) {
        const unit = units.find(u => u._id.toString() === expense.unidadeId);
        if (!unit) continue;
        
        if (!totalsByUnit[expense.unidadeId]) {
            const estimateDoc = allEstimates.find(est => est.unidadeId === expense.unidadeId);
            totalsByUnit[expense.unidadeId] = {
                unitName: unit.nome,
                marketType: unit.marketType,
                real: 0,
                estimado: unit.marketType === 'livre' ? (estimateDoc ? estimateDoc.valor : 0) : 0
            };
        }
        totalsByUnit[expense.unidadeId].real += expense.valor;

        if (expense.detalhesDistribuidora) {
            if (expense.detalhesDistribuidora.demandaUltrValor > 0) {
                penalties.push({
                    unitName: unit.nome,
                    type: 'Multa de Demanda',
                    value: expense.detalhesDistribuidora.demandaUltrValor
                });
            }
            if (expense.detalhesDistribuidora.reativoValor > 0) {
                penalties.push({
                    unitName: unit.nome,
                    type: 'Multa de Reativo',
                    value: expense.detalhesDistribuidora.reativoValor
                });
            }
        }
    }

    let totalEconomia = 0;
    const analysisPerUnit = Object.values(totalsByUnit)
        .filter(u => u.marketType === 'livre')
        .map(u => {
            const economia = u.estimado > 0 ? u.estimado - u.real : 0;
            totalEconomia += economia;
            return {
                ...u,
                economia
            };
        });
    
    const kpis = { totalDespesas, economia: totalEconomia, totalUnidades: units.length };
    
    return { kpis, analysisPerUnit, penalties };
}

// Helper to build the HTML for the email report
function buildHtmlReport(competenceLabel, kpis, analysisData) {
    const { analysisPerUnit, penalties } = analysisData;
    const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    
    const logoUrl = APP_LOGO_URL || logoDataUriFallback;

    const analysisRows = analysisPerUnit.map(unit => `
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #4a5568;">${unit.unitName}</td>
            <td style="padding: 12px; border-bottom: 1px solid #4a5568; text-align: right;">${formatCurrency(unit.real)}</td>
            <td style="padding: 12px; border-bottom: 1px solid #4a5568; text-align: right;">${formatCurrency(unit.estimado)}</td>
            <td style="padding: 12px; border-bottom: 1px solid #4a5568; text-align: right; font-weight: bold; color: ${unit.economia >= 0 ? '#48bb78' : '#f56565'};">${formatCurrency(unit.economia)}</td>
        </tr>
    `).join('');

    let penaltiesSection = '';
    if (penalties && penalties.length > 0) {
        const penaltyRows = penalties.map(p => `
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #4a5568;">${p.unitName}</td>
                <td style="padding: 12px; border-bottom: 1px solid #4a5568;">${p.type}</td>
                <td style="padding: 12px; border-bottom: 1px solid #4a5568; text-align: right;">${formatCurrency(p.value)}</td>
            </tr>
        `).join('');

        penaltiesSection = `
            <div style="margin-top: 32px;">
                <h3 style="color: #f56565; font-size: 18px; margin-bottom: 16px; border-bottom: 2px solid #4a5568; padding-bottom: 8px;">Observações de Análise (Multas)</h3>
                <table style="width: 100%; border-collapse: collapse; color: #cbd5e0;">
                    <thead>
                        <tr>
                            <th style="background-color: #4a5568; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #e2e8f0;">Unidade</th>
                            <th style="background-color: #4a5568; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #e2e8f0;">Tipo da Multa</th>
                            <th style="background-color: #4a5568; padding: 12px; text-align: right; font-size: 12px; text-transform: uppercase; color: #e2e8f0;">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${penaltyRows}
                    </tbody>
                </table>
            </div>
        `;
    }

    return `
       <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Relatório de Custos de Energia</title>
        </head>
        <body style="margin: 0; padding: 0; width: 100%; background-color: #111827; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                    <td align="center" style="padding: 20px 0;">
                        <table width="800" border="0" cellspacing="0" cellpadding="0" style="max-width: 800px; width: 100%; background-color: #1f2937; border-radius: 8px; overflow: hidden;">
                            <!-- Header -->
                            <tr>
                                <td align="center" style="background-color: #111827; padding: 24px;">
                                    <img src="${logoUrl}" alt="Logo" style="height: 48px; width: auto; margin-bottom: 16px;"/>
                                    <h1 style="color: #ffffff; font-size: 28px; margin: 0;">Relatório de Custos de Energia</h1>
                                    <h2 style="color: #a5b4fc; font-size: 20px; font-weight: 500; margin: 8px 0 0;">Competência: ${competenceLabel}</h2>
                                </td>
                            </tr>
                            <!-- Content -->
                            <tr>
                                <td style="padding: 32px;">
                                    <h3 style="color: #ffffff; font-size: 18px; margin: 0 0 16px; border-bottom: 2px solid #4a5568; padding-bottom: 8px;">Resumo Geral</h3>
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 32px;">
                                        <tr>
                                            <td align="center" style="padding: 8px;">
                                                <div style="background-color: #4a5568; padding: 16px; border-radius: 8px; text-align: center;">
                                                    <p style="margin: 0; font-size: 14px; color: #a0aec0;">Custo Total</p>
                                                    <span style="font-size: 24px; font-weight: bold; color: #ffffff;">${formatCurrency(kpis.totalDespesas)}</span>
                                                </div>
                                            </td>
                                            <td align="center" style="padding: 8px;">
                                                <div style="background-color: #4a5568; padding: 16px; border-radius: 8px; text-align: center;">
                                                    <p style="margin: 0; font-size: 14px; color: #a0aec0;">Economia Gerada</p>
                                                    <span style="font-size: 24px; font-weight: bold; color: ${kpis.economia >= 0 ? '#48bb78' : '#f56565'};">${formatCurrency(kpis.economia)}</span>
                                                </div>
                                            </td>
                                            <td align="center" style="padding: 8px;">
                                                 <div style="background-color: #4a5568; padding: 16px; border-radius: 8px; text-align: center;">
                                                    <p style="margin: 0; font-size: 14px; color: #a0aec0;">Unidades Analisadas</p>
                                                    <span style="font-size: 24px; font-weight: bold; color: #ffffff;">${kpis.totalUnidades}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    </table>
                                    
                                    <div style="margin-top: 32px;">
                                        <h3 style="color: #ffffff; font-size: 18px; margin-bottom: 16px; border-bottom: 2px solid #4a5568; padding-bottom: 8px;">Análise do Mercado Livre</h3>
                                        <table style="width: 100%; border-collapse: collapse; color: #cbd5e0;">
                                            <thead>
                                                <tr>
                                                    <th style="background-color: #4a5568; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #e2e8f0;">Unidade</th>
                                                    <th style="background-color: #4a5568; padding: 12px; text-align: right; font-size: 12px; text-transform: uppercase; color: #e2e8f0;">Custo Real (Livre)</th>
                                                    <th style="background-color: #4a5568; padding: 12px; text-align: right; font-size: 12px; text-transform: uppercase; color: #e2e8f0;">Custo Estimado (Cativo)</th>
                                                    <th style="background-color: #4a5568; padding: 12px; text-align: right; font-size: 12px; text-transform: uppercase; color: #e2e8f0;">Economia</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${analysisPerUnit.length > 0 ? analysisRows : '<tr><td colspan="4" style="text-align: center; padding: 20px;">Nenhuma unidade do Mercado Livre para análise nesta competência.</td></tr>'}
                                            </tbody>
                                        </table>
                                    </div>
                                    
                                    ${penaltiesSection}
                                </td>
                            </tr>
                             <!-- Footer -->
                            <tr>
                                <td align="center" style="padding: 24px; font-size: 12px; color: #718096; border-top: 1px solid #2d3748;">
                                    <p style="margin: 0;">Relatório gerado automaticamente pelo Gestor de Energia.</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
    `;
}