from django.db import models
from django.conf import settings

class Componente(models.Model):
    id = models.CharField(max_length=10, primary_key=True)
    nombre = models.CharField(max_length=50)

    def __str__(self):
        return self.nombre

class MenuItem(models.Model):
    id = models.CharField(max_length=10, primary_key=True)
    nombre = models.CharField(max_length=50)
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    descripcion = models.CharField(max_length=100)
    componentes = models.ManyToManyField(
        Componente, 
        related_name='menu_items', 
        blank=True, 
        db_table='core_menuitemcomponente'  # Nombre correcto de la tabla intermedia
    )

    def __str__(self):
        return self.nombre

class Estado(models.Model):
    id = models.CharField(max_length=5, primary_key=True)
    nombre = models.CharField(max_length=30)

    def __str__(self):
        return self.nombre

class Mesa(models.Model):
    id = models.CharField(max_length=5, primary_key=True)
    numero = models.IntegerField()

    def __str__(self):
        return f"Mesa {self.numero}"

class Cliente(models.Model):
    id = models.CharField(max_length=10, primary_key=True)
    documento = models.CharField(max_length=15)
    nombre = models.CharField(max_length=60)
    celular = models.CharField(max_length=15)

    def __str__(self):
        return self.nombre

class Pedido(models.Model):
    id = models.CharField(max_length=10, primary_key=True)
    hora_creacion = models.TimeField(auto_now_add=True)
    hora_pago = models.TimeField(null=True, blank=True)
    fecha_creacion = models.DateField(auto_now_add=True)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    mesa = models.ForeignKey(Mesa, on_delete=models.CASCADE)
    cliente = models.ForeignKey(Cliente, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"Pedido {self.id} - {self.fecha_creacion}"

    def calcular_total(self):
        """Calcula el total del pedido basado en las órdenes asociadas"""
        ordenes = self.ordenes.all()
        self.subtotal = sum(orden.menu_item.precio for orden in ordenes)
        # Aquí podrías implementar alguna lógica para impuestos o descuentos
        self.total = self.subtotal
        self.save()

class Orden(models.Model):
    id = models.CharField(max_length=10, primary_key=True)
    hora_creacion = models.TimeField(auto_now_add=True)
    hora_entrega = models.TimeField(null=True, blank=True)
    anotacion = models.CharField(max_length=100, blank=True, null=True)
    pedido = models.ForeignKey(Pedido, related_name='ordenes', on_delete=models.CASCADE)
    menu_item = models.ForeignKey(MenuItem, on_delete=models.CASCADE)
    estado = models.ForeignKey(Estado, on_delete=models.CASCADE)

    def __str__(self):
        return f"Orden {self.id} - {self.menu_item.nombre}"