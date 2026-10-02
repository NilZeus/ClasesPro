let planActual = { nombre: '', precio: 0 };

const stripeKey = window.STRIPE_PUBLIC_KEY || '';
const stripe = stripeKey && stripeKey.startsWith('pk_') && !/TU_CLAVE|replace_me/i.test(stripeKey)
    ? Stripe(stripeKey)
    : null;

function mostrarErrorStripe(mensaje) {
    alert(mensaje);
}

// Abrir modal de pago
function abrirPago(plan, precio) {
    planActual = { nombre: plan, precio: precio };
    
    document.getElementById('planSeleccionado').textContent = plan;
    document.getElementById('totalPagar').textContent = '$' + precio;
    document.getElementById('btnTotal').textContent = '$' + precio;
    document.getElementById('modalPago').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Cerrar modal
function cerrarPago() {
    document.getElementById('modalPago').classList.remove('active');
    document.body.style.overflow = 'auto';
    document.getElementById('formPago').reset();
}

// Cerrar al hacer click fuera
document.getElementById('modalPago').addEventListener('click', (e) => {
    if (e.target.id === 'modalPago') cerrarPago();
});

// Formatear número de tarjeta
document.getElementById('tarjeta').addEventListener('input', function(e) {
    let v = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
    let formatted = v.match(/.{1,4}/g)?.join(' ') || '';
    e.target.value = formatted;
});

// Formatear fecha MM/AA
document.getElementById('fecha').addEventListener('input', function(e) {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length >= 2) v = v.slice(0,2) + '/' + v.slice(2,4);
    e.target.value = v;
});

// Solo números en CVC
document.getElementById('cvc').addEventListener('input', function(e) {
    e.target.value = e.target.value.replace(/\D/g, '');
});

// Procesar pago
async function procesarPago(event) {
    event.preventDefault();
    
    const datos = {
        nombre: document.getElementById('nombre').value,
        email: document.getElementById('email').value,
        telefono: document.getElementById('telefono').value,
        materia: document.getElementById('materia').value,
        plan: planActual.nombre,
        precio: planActual.precio,
        tarjeta: document.getElementById('tarjeta').value.slice(-4)
    };

    const btn = event.target.querySelector('.btn-pagar');
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Redirigiendo...';
    btn.disabled = true;

    try {
        if (!stripe) {
            mostrarErrorStripe('Stripe no está configurado. Reemplaza la clave pública en window.STRIPE_PUBLIC_KEY con tu clave real de test.');
            btn.innerHTML = textoOriginal;
            btn.disabled = false;
            return;
        }

        localStorage.setItem('ultimoPedido', JSON.stringify(datos));

        const response = await fetch('/crear-pago', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                plan: datos.plan,
                precio: datos.precio,
                email: datos.email
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al crear la sesión de pago');
        }

        const data = await response.json();

        const { error } = await stripe.redirectToCheckout({
            sessionId: data.id
        });

        if (error) {
            throw error;
        }

        cerrarPago();
    } catch (error) {
        console.error('Stripe Checkout error:', error);
        mostrarErrorStripe('Hubo un problema con el pago. Revisa la configuración de Stripe y el backend.');
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
}

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// Animación al hacer scroll
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('.card, .pricing-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'all 0.6s ease';
    observer.observe(el);
});