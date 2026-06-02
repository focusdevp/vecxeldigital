from pymongo import MongoClient
import pprint

print("Probando con 127.0.0.1:27018...")
client = MongoClient("mongodb://127.0.0.1:27018")

print(f"\nBases de datos disponibles:")
for db_name in client.list_database_names():
    print(f"  - {db_name}")

db = client.vecxeldigital
print(f"\nBase de datos seleccionada: {db.name}")
print(f"Colecciones: {db.list_collection_names()}")

print(f"\nStats de la colección 'products':")
stats = db.command("collStats", "products")
print(f"  count: {stats.get('count')}")
print(f"  size: {stats.get('size')} bytes")

count = db.products.count_documents({})
print(f"\ncount_documents({{}}): {count}")

print(f"\nIntentando find().limit(1):")
producto = db.products.find_one()
if producto:
    print(f"  SKU encontrado: {producto.get('sku')}")
else:
    print("  No se encontraron productos")

client.close()
