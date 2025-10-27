# 🔧 FIX SIGN UP KHÔNG HOẠT ĐỘNG

## ✅ **DATABASE ĐÃ CHẠY RỒI!**

```bash
# Kiểm tra vừa rồi:
✅ Database container đang chạy (STATUS: Up 2 hours)
✅ Port 5432 đã mở
```

---

## 🧪 **TEST SIGN UP NGAY**

### **Cách 1: Test qua Browser** (Dễ nhất)

1. Mở browser: `http://localhost:3000`
2. Click "Sign Up" 
3. Điền form:
   - **Name**: Test User
   - **Email**: test123@example.com
   - **Password**: password123
4. Click "Sign Up"

**Nếu lỗi** → Xem console (F12) hoặc terminal logs

---

### **Cách 2: Test qua API trực tiếp**

```bash
# Test Register API
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test123@example.com", 
    "password": "password123"
  }'
```

**Kết quả mong đợi**:
```json
{
  "message": "User created successfully",
  "user": {
    "id": "...",
    "name": "Test User",
    "email": "test123@example.com"
  }
}
```

**Nếu lỗi**:
```json
{
  "error": "User already exists"  // Email đã tồn tại
}
```
hoặc
```json
{
  "error": "Failed to create user"  // Database error
}
```

---

## 🐛 **CÁC LỖI THƯỜNG GẶP**

### **Lỗi 1: "Failed to create user"**

**Nguyên nhân**: Database schema chưa đúng

**Fix**:
```bash
# Chạy migrations
npx prisma migrate dev

# Hoặc force sync
npx prisma db push
```

---

### **Lỗi 2: "User already exists"**

**Nguyên nhân**: Email đã được đăng ký

**Fix**: Dùng email khác hoặc xóa user cũ
```bash
# Mở Prisma Studio
npx prisma studio

# Vào table User → Xóa user cũ
# Hoặc dùng email mới
```

---

### **Lỗi 3: "Cannot reach database"**

**Nguyên nhân**: Connection string sai

**Fix**: Check `.env` file
```bash
# .env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/english101?schema=public"
```

**Restart dev server**:
```bash
# Stop (Ctrl+C)
# Start lại
npm run dev
```

---

### **Lỗi 4: Frontend không gọi API**

**Nguyên nhân**: JavaScript error

**Fix**:
1. Mở DevTools (F12)
2. Xem Console tab
3. Xem Network tab
4. Check có request đến `/api/auth/register` không

---

## 🔍 **DEBUG CHECKLIST**

```bash
# 1. Check database running
docker compose ps
# ✅ Should show: STATUS = Up

# 2. Check migrations
npx prisma migrate status
# ✅ Should show: Database schema is up to date

# 3. Check schema in database
npx prisma studio
# ✅ Mở http://localhost:5555 → Check table User có column "password" không

# 4. Check dev server running
# ✅ Terminal should show: ready - started server on 0.0.0.0:3000

# 5. Test API directly
curl http://localhost:3000/api/auth/register
# ✅ Should NOT show 404
```

---

## 📝 **LOG ĐỂ KIỂM TRA**

### **Backend Logs** (Terminal chạy `npm run dev`)
```
Check xem có error gì:
- Prisma error
- Database connection error
- bcrypt error
- NextAuth error
```

### **Frontend Logs** (Browser Console - F12)
```
Check xem có error gì:
- Network error
- CORS error
- 400/500 status code
```

---

## ✅ **TEST THÀNH CÔNG KHI:**

1. ✅ Click "Sign Up" → Form submit thành công
2. ✅ Redirect về `/authentication/login`
3. ✅ Có thể login với email/password vừa tạo
4. ✅ Vào được dashboard sau khi login

---

## 🚀 **NẾU VẪN KHÔNG WORK**

### **Option 1: Reset toàn bộ database**
```bash
# Xóa database
docker compose down -v

# Tạo lại
docker compose up -d

# Chạy migrations
npx prisma migrate dev

# Seed data
npm run db:seed
```

### **Option 2: Check code**
```bash
# Check file này có đúng không:
# src/app/api/auth/register/route.ts

# Đảm bảo có:
# - bcrypt.hash() cho password
# - prisma.user.create()
# - Try-catch error handling
```

### **Option 3: Hỏi tôi!** 😊
Gửi cho tôi:
1. **Error message** (từ terminal hoặc browser console)
2. **Screenshot** nếu có
3. **Steps** bạn đã làm

---

## 📞 **CONTACT DEBUG**

**Nếu vẫn lỗi, chạy lệnh này và gửi kết quả cho tôi**:

```bash
# Check environment
echo "=== Node Version ===" && node -v
echo "=== NPM Version ===" && npm -v
echo "=== Docker Status ===" && docker compose ps
echo "=== Prisma Status ===" && npx prisma migrate status
```

---

**Chúc bạn fix thành công!** 🎉

