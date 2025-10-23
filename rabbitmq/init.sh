#!/bin/bash

# Esperar a que RabbitMQ esté completamente iniciado
echo "⏳ Waiting for RabbitMQ to start..."
sleep 15

# Configurar credenciales
RABBITMQ_USER="admin"
RABBITMQ_PASS="admin123"
RABBITMQ_HOST="localhost:15672"

# Función para verificar si RabbitMQ está listo
wait_for_rabbitmq() {
    until rabbitmqctl status > /dev/null 2>&1; do
        echo "⏳ Waiting for RabbitMQ..."
        sleep 2
    done
    echo "✅ RabbitMQ is ready!"
}

wait_for_rabbitmq

echo "🚀 Starting RabbitMQ initialization..."

# ========================================
# CREAR EXCHANGES
# ========================================
echo "📦 Creating exchanges..."

rabbitmqadmin -u $RABBITMQ_USER -p $RABBITMQ_PASS declare exchange \
    name=notifications.events \
    type=fanout \
    durable=true \
    auto_delete=false

rabbitmqadmin -u $RABBITMQ_USER -p $RABBITMQ_PASS declare exchange \
    name=professional.events \
    type=topic \
    durable=true \
    auto_delete=false

echo "✅ Exchanges created!"

# ========================================
# CREAR COLAS
# ========================================
echo "📬 Creating queues..."

rabbitmqadmin -u $RABBITMQ_USER -p $RABBITMQ_PASS declare queue \
    name=notificationservice.notifications \
    durable=true \
    auto_delete=false \
    arguments='{"x-dead-letter-exchange":"notifications.events.dlx","x-message-ttl":86400000,"x-queue-type":"classic"}'

rabbitmqadmin -u $RABBITMQ_USER -p $RABBITMQ_PASS declare queue \
    name=postino_email_queue \
    durable=true \
    auto_delete=false \
    arguments='{"x-queue-type":"classic"}'

rabbitmqadmin -u $RABBITMQ_USER -p $RABBITMQ_PASS declare queue \
    name=authservice.professional.events \
    durable=true \
    auto_delete=false \
    arguments='{"x-message-ttl":86400000,"x-queue-type":"classic"}'

rabbitmqadmin -u $RABBITMQ_USER -p $RABBITMQ_PASS declare queue \
    name=appointmentservice.professional.events \
    durable=true \
    auto_delete=false \
    arguments='{"x-message-ttl":86400000,"x-queue-type":"classic"}'

echo "✅ Queues created!"

# ========================================
# CREAR BINDINGS
# ========================================
echo "🔗 Creating bindings..."

rabbitmqadmin -u $RABBITMQ_USER -p $RABBITMQ_PASS declare binding \
    source=notifications.events \
    destination=notificationservice.notifications \
    routing_key="#"

rabbitmqadmin -u $RABBITMQ_USER -p $RABBITMQ_PASS declare binding \
    source=professional.events \
    destination=appointmentservice.professional.events \
    routing_key="professional.*"

rabbitmqadmin -u $RABBITMQ_USER -p $RABBITMQ_PASS declare binding \
    source=professional.events \
    destination=authservice.professional.events \
    routing_key="professional.*"

echo "✅ Bindings created!"

echo "🎉 RabbitMQ initialization complete!"
echo ""
echo "📊 Summary:"
echo "  - Exchanges: notifications.events (fanout), professional.events (topic)"
echo "  - Queues: 4 queues created"
echo "  - Bindings: 3 bindings configured"
echo ""
echo "🌐 Access RabbitMQ Management UI at: http://localhost:15672"
echo "   Username: admin"
echo "   Password: admin123"