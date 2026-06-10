# 🚀 Guía de Integración SAC - Vecxel Digital

**Fecha:** 04/06/2026  
**Versión:** 2.0 - Sistema Dual (HTTP API + SFTP)

---

## 📋 **Opciones de Conexión Disponibles**

Vecxel Digital ahora ofrece **dos métodos** para sincronizar datos. SAC puede elegir el que prefiera:

### **🌐 Opción 1: HTTP API (Recomendado para desarrollo)**
- Subida directa vía web
- Dashboard integrado
- Feedback inmediato

### **📡 Opción 2: SFTP (Recomendado para producción)**
- Subida tradicional con Filezilla/Cyberduck
- Robusto y confiable
- Procesamiento automático

---

## 🌐 **Opción 1: HTTP API**

### **🔗 URLs de Acceso**
- **Dashboard:** `http://localhost:3000`
- **API Directa:** `http://localhost:4000/sync/inventario`

### **📤 Cómo subir archivos:**

#### **Método A: Dashboard Web**
1. Abrir `http://localhost:3000` en navegador
2. Hacer clic en el área de "Subir archivo de inventario"
3. Arrastrar o seleccionar archivo `.txt`
4. Esperar confirmación de procesamiento

#### **Método B: API Directa (Postman/cURL)**
```bash
curl -X POST http://localhost:4000/sync/inventario \
  -H "X-API-Key: clave_de_prueba" \
  -F "file=@inventario.txt"
```

### **✅ Ventajas HTTP API**
- ✅ Feedback inmediato en pantalla
- ✅ Dashboard con estadísticas
- ✅ Logs detallados en tiempo real
- ✅ Reintentos automáticos
- ✅ Validación instantánea

---

## 📡 **Opción 2: SFTP**

### **🔧 Configuración Filezilla/Cyberduck**

```
Protocolo: SFTP
Host: localhost
Puerto: 2222
Usuario: sac
Contraseña: vecxel2026
```

### **📤 Cómo subir archivos:**

#### **Con Filezilla:**
1. Abrir Filezilla
2. Configurar conexión con los datos above
3. Conectar al servidor
4. Arrastrar archivo `.txt` a la carpeta remota
5. Esperar a que se complete la transferencia

#### **Con Cyberduck:**
1. Abrir Cyberduck
2. Nueva conexión → SFTP
3. Ingresar credenciales
4. Conectar y arrastrar archivo

### **🤖 Procesamiento Automático**
- El **monitor SFTP** detecta archivos automáticamente
- Procesa según el tipo:
  - `*inventario*.txt` → `/sync/inventario`
  - `*cliente*.txt` → `/sync/clientes`
- Logs disponibles en dashboard: `http://localhost:3000/logs`

### **✅ Ventajas SFTP**
- ✅ Familiar para equipos de sistemas
- ✅ Transferencia robusta con reintentos
- ✅ Soporta archivos grandes
- ✅ Procesamiento automático sin intervención
- ✅ Compatible con herramientas existentes

---

## 🚀 **Iniciar los Sistemas**

### **Sistema HTTP API:**
```powershell
.\start-http.ps1
```

### **Sistema SFTP:**
```powershell
.\start-sftp.ps1
```

### **Detener ambos sistemas:**
```powershell
.\stop.ps1
```

---

## 📊 **Monitoreo y Logs**

### **Dashboard Web:**
- **URL:** `http://localhost:3000`
- **Logs:** `http://localhost:3000/logs`
- **Inventario:** `http://localhost:3000/inventario`
- **Clientes:** `http://localhost:3000/clientes`

### **Información disponible en logs:**
- ✅ Fecha y hora (Venezuela/Caracas)
- ✅ Nombre del archivo
- ✅ Estado: exitoso/parcial/fallido
- ✅ Total de registros procesados
- ✅ Errores detallados
- ✅ Duración del procesamiento
- ✅ Descarga de archivos procesados

---

## 🔍 **Formato de Archivos**

### **Inventario (TXT):**
```
SKU;DESCRIPCION;UNIDAD;PRECIO;ALM1;STOCK1;ALM2;STOCK2;...
BISA100X42;BISAGRA 100X42;UN;15.50;00;150;30;75;40;50
```

### **Clientes (TXT):**
```
RIF;NOMBRE;DIRECCION;TELEFONOS;EMAIL;VENDEDOR;ZONA;PAGO
J-12345678-9;MI EMPRESA CA;DIRECCIÓN...;0414-1234567;email@...;V001;Z001;CONTADO
```

---

## 🚨 **Códigos de Error Comunes**

### **HTTP API:**
- `200` ✅ Procesamiento exitoso
- `409` ⚠️ Archivo duplicado (última hora)
- `422` ❌ Error de validación (formato/contenido)

### **SFTP:**
- ✅ Conexión exitosa
- 🤖 Procesamiento automático
- 📊 Verificar logs en dashboard para resultados

---

## 💡 **Recomendaciones**

### **Para desarrollo/pruebas:**
- Usar **HTTP API** por el feedback inmediato
- Dashboard web facilita debugging

### **Para producción:**
- Usar **SFTP** por robustez
- Procesamiento automático sin intervención
- Compatible con flujos existentes

### **Mejores prácticas:**
- ✅ Validar formato antes de subir
- ✅ Usar nombres descriptivos de archivos
- ✅ Esperar confirmación antes de reintentar
- ✅ Monitorear logs regularmente

---

## 🆘 **Soporte**

### **Verificar estado:**
1. Dashboard web debe mostrar productos cargados
2. Logs deben mostrar procesamiento reciente
3. APIs deben responder en puertos 4000/8000

### **Problemas comunes:**
- **Duplicados:** Esperar 1 hora o modificar archivo
- **Formato:** Validar separador punto y coma (;)
- **Conexión:** Verificar que servicios estén iniciados

---

## 📞 **Contacto**

Para soporte técnico o dudas:
- Revisar logs en dashboard
- Verificar estado de servicios
- Contactar equipo Vecxel Digital

---

**🎉 SAC ahora tiene flexibilidad total para elegir el método de sincronización que prefiera!**
