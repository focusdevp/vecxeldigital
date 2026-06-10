# 🚀 Scripts de Inicio - Vecxel Digital

**Fecha:** 04/06/2026  
**Versión:** 2.0 - Sistema Dual

---

## 📋 **Scripts Disponibles**

### **🌐 Sistema HTTP API (Tradicional)**
```powershell
.\start-http.ps1
```
**Inicia:**
- MongoDB (Docker)
- SAC Connector FastAPI (puerto 4000)
- Vecxel API FastAPI (puerto 8000)
- Dashboard Next.js (puerto 3000)

**Uso:** Subida por HTTP/POST desde dashboard o API directa

---

### **📡 Sistema SFTP (Nuevo)**
```powershell
.\start-sftp.ps1
```
**Inicia:**
- MongoDB (Docker)
- SAC Connector FastAPI (puerto 4000)
- Vecxel API FastAPI (puerto 8000)
- Dashboard Next.js (puerto 3000)
- Servidor SFTP (puerto 2222)
- Monitor SFTP (detecta archivos automáticamente)

**Uso:** Subida por Filezilla/Cyberduck

---

### **🛑 Detener ambos sistemas:**
```powershell
.\stop.ps1
```
**Detiene:**
- Todos los procesos en puertos 3000, 4000, 8000, 2222
- Contenedores MongoDB (Docker)

---

## 🔧 **Configuración SFTP para SAC**

### **Filezilla/Cyberduck:**
```
Protocolo: SFTP
Host: localhost
Puerto: 2222
Usuario: sac
Contraseña: vecxel2026
```

### **Carpetas:**
- **Uploads:** `sftp-server/sftp_uploads/`
- **Monitor:** Detecta archivos automáticamente
- **Procesamiento:** Envía a SAC Connector API

---

## 🌐 **URLs de Acceso**

### **Dashboard Web:**
- **Local:** `http://localhost:3000`
- **Logs:** `http://localhost:3000/logs`
- **Inventario:** `http://localhost:3000/inventario`

### **APIs:**
- **SAC Connector:** `http://localhost:4000`
- **Vecxel API:** `http://localhost:8000`

---

## 📊 **Flujo de Trabajo**

### **Para desarrollo/pruebas:**
1. Usar `.\start-http.ps1`
2. Subir por dashboard web
3. Feedback inmediato

### **Para producción/SAC:**
1. Usar `.\start-sftp.ps1`
2. SAC sube por Filezilla
3. Procesamiento automático

### **Para detener:**
1. `.\stop.ps1`
2. Detiene ambos sistemas

---

## 🚨 **Comandos Útiles**

### **Verificar Docker:**
```powershell
docker ps
```

### **Verificar puertos:**
```powershell
netstat -an | findstr ":3000"
netstat -an | findstr ":4000"
netstat -an | findstr ":8000"
netstat -an | findstr ":2222"
```

### **Ver logs de contenedores:**
```powershell
docker logs sac_connector_db
docker logs vecxel_app_db
```

---

## 💡 **Recomendaciones**

### **SAC puede elegir:**
- **HTTP API:** Más rápido para desarrollo
- **SFTP:** Más robusto para producción

### **Mantenimiento:**
- Usar `.\stop.ps1` antes de reiniciar
- Verificar Docker Desktop antes de iniciar
- Monitorear logs en dashboard

---

## 🆘 **Solución de Problemas**

### **Si Docker no inicia:**
1. Abrir Docker Desktop
2. Esperar a que esté listo
3. Ejecutar script nuevamente

### **Si puerto ocupado:**
1. `.\stop.ps1`
2. Esperar 10 segundos
3. `.\start-*.ps1`

### **Si SFTP no conecta:**
1. Verificar que `.\start-sftp.ps1` se ejecutó
2. Revisar firewall puerto 2222
3. Verificar credenciales (sac/vecxel2026)

---

**🎯 Sistema dual listo para SAC!**
