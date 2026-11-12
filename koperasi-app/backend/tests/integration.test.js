// tests/integration.test.js
const request = require('supertest');
const app = require('../server'); // Sesuaikan path jika perlu

describe('Integration Test: API Koperasi', () => {
    let token;

    // Login sekali sebelum semua test dimulai
    beforeAll(async () => {
        // GANTI dengan username & password yang ada di database test Anda
        const res = await request(app)
            .post('/auth/login')
            .send({ username: 'testuser', password: 'password123' });
        token = res.body.token;
    });

    // 1. Uji Login Berhasil
    test('POST /auth/login - Berhasil dengan kredensial valid', async () => {
        const res = await request(app)
            .post('/auth/login')
            .send({ username: 'testuser', password: 'password123' });

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('token');
    });

    // 2. Uji Login Gagal
    test('POST /auth/login - Gagal dengan password salah', async () => {
        const res = await request(app)
            .post('/auth/login')
            .send({ username: 'testuser', password: 'salah' });

        expect(res.statusCode).toBe(400);
    });

    // 3. Uji Akses Endpoint Terproteksi (Butuh Token)
    test('GET /dashboard/summary - Berhasil dengan token', async () => {
        const res = await request(app)
            .get('/dashboard/summary')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('totalSavings');
    });

    // 4. Uji Tanpa Token (Harus Gagal)
    test('GET /dashboard/summary - Gagal tanpa token', async () => {
        const res = await request(app).get('/dashboard/summary');
        expect(res.statusCode).toBe(401);
    });
});