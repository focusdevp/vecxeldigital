# 📁 Estructura de Carpetas SFTP

## 🎯 Organización

El servidor SFTP ahora utiliza **carpetas separadas** para cada tipo de archivo:

```
sftp_uploads/
├── inventario/              ← Archivos de inventario (SKU, productos, stock)
│   ├── [archivos nuevos]
│   ├── processed/           ← Archivos procesados exitosamente
│   └── failed/              ← Archivos rechazados por validación
│
└── clientes/                ← Archivos de clientes
    ├── [archivos nuevos]
    ├── processed/           ← Archivos procesados exitosamente
    └── failed/              ← Archivos rechazados por validación
```

---

## 📋 Cómo Funciona

### 1. **Subir Archivos**

**Inventario:**
```
Subir a: sftp://localhost:2222/inventario/
Archivo: SKU-INVENTARIO.txt, productos.txt, etc.
```

**Clientes:**
```
Subir a: sftp://localhost:2222/clientes/
Archivo: CLIENTES.txt, clientes-nuevos.txt, etc.
```

### 2. **Procesamiento Automático**

El monitor (`sftp_monitor_simple.py`) detecta automáticamente:

- ✅ Archivos en `inventario/` → Envía a `/sync/inventario`
- ✅ Archivos en `clientes/` → Envía a `/sync/clientes`

### 3. **Destino Final**

**Archivo exitoso:**
```
inventario/archivo.txt → inventario/processed/archivo.txt
```

**Archivo duplicado:**
```
inventario/archivo.txt → inventario/processed/archivo_20260610_171500.txt
```

**Archivo con errores:**
```
inventario/archivo.txt → inventario/failed/archivo.txt
```

---

## 🔐 Credenciales SFTP

```
Host: localhost
Puerto: 2222
Usuario: sac
Password: vecxel2026
```

---

## 🧪 Ejemplos de Uso

### FileZilla (GUI)

1. Conectar a `sftp://localhost:2222`
2. Usuario: `sac`, Password: `vecxel2026`
3. Navegar a carpeta `inventario/` o `clientes/`
4. Arrastrar archivo
5. Esperar 3-5 segundos
6. Verificar que se movió a `processed/` o `failed/`

### WinSCP (GUI)

1. Protocolo: SFTP
2. Host: localhost, Puerto: 2222
3. Usuario: sac, Password: vecxel2026
4. Subir a `/inventario/` o `/clientes/`

### Línea de Comandos (sftp)

```bash
# Conectar
sftp -P 2222 sac@localhost

# Subir inventario
cd inventario
put SKU-INVENTARIO.txt

# Subir clientes
cd ../clientes
put CLIENTES.txt

# Salir
bye
```

---

## ⚠️ Reglas Importantes

1. **NO subir archivos a la raíz** (`sftp_uploads/`)
   - ❌ `sftp_uploads/archivo.txt` → No se procesará
   - ✅ `sftp_uploads/inventario/archivo.txt` → Se procesará

2. **NO subir a subcarpetas** (`processed/`, `failed/`)
   - ❌ `inventario/processed/archivo.txt` → Ignorado
   - ✅ `inventario/archivo.txt` → Procesado

3. **Solo archivos .txt**
   - ✅ `archivo.txt` → Procesado
   - ❌ `archivo.csv` → Ignorado

---

## 📊 Monitoreo

Ver logs del monitor:
```bash
cd sftp-server
python sftp_monitor_simple.py
```

Salida esperada:
```
📁 Monitor SFTP iniciado
📂 Carpeta base: C:\...\sftp_uploads
📦 Monitoreando: inventario/ y clientes/
🔗 API: http://localhost:4000
⏱️  Intervalo: 3s
✅ Monitor activo - esperando archivos...
```

---

## 🚀 Ventajas de esta Estructura

✅ **Organización clara** - Cada tipo de archivo en su carpeta
✅ **Sin confusión** - No hay detección por nombre
✅ **Escalable** - Fácil agregar nuevos tipos (facturas/, pedidos/, etc.)
✅ **Auditable** - Fácil ver qué se procesó y qué falló
✅ **Seguro** - Archivos fallidos no se pierden

---

## 🔧 Mantenimiento

### Limpiar archivos procesados antiguos

```powershell
# Eliminar archivos de más de 30 días
Get-ChildItem "sftp_uploads\*/processed" -Recurse -File | 
  Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-30)} | 
  Remove-Item
```

### Ver estadísticas

```powershell
# Contar archivos por carpeta
Get-ChildItem "sftp_uploads\inventario\processed" | Measure-Object
Get-ChildItem "sftp_uploads\clientes\processed" | Measure-Object
Get-ChildItem "sftp_uploads\*/failed" -Recurse | Measure-Object
```
