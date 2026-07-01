const form = document.querySelector('#spin-form');
const input = document.querySelector('#mobile');
const phoneField = document.querySelector('#phone-field');
const message = document.querySelector('#form-message');
const submit = document.querySelector('#spin-submit');
const wheel = document.querySelector('#wheel');
const modal = document.querySelector('#result-modal');
const resultTitle = document.querySelector('#result-title');
const resultDetail = document.querySelector('#result-detail');
const resultCode = document.querySelector('#result-code');
const closeModal = document.querySelector('#close-modal');
const doneButton = document.querySelector('#done-button');
const config = window.SPIN_CONFIG;
const winSound = document.getElementById("winSound");
const spinSound = document.getElementById("spinSound");

let rotation = 0;
let spinning = false;

function setMessage(text = '', invalid = false) {
  message.textContent = text;
  phoneField.classList.toggle('invalid', invalid);
}

function validMobile(value) {
  return /^[6-9]\d{9}$/.test(value);
}

input.addEventListener('input', () => {
  input.value = input.value.replace(/\D/g, '').slice(0, 10);
  if (message.textContent) setMessage();
});

function celebrate(prizeCode) {
  winSound.currentTime = 0;
  winSound.play().catch(() => {});

  // 🏆 GRAND PRIZE - 50% OFF
  if (prizeCode === "TOWEL50") {
    confetti({
      particleCount: 350,
      spread: 180,
      startVelocity: 70,
      ticks: 350,
      origin: { y: 0.55 },
    });

    setTimeout(() => {
      confetti({
        particleCount: 250,
        angle: 60,
        spread: 80,
        origin: { x: 0 },
      });

      confetti({
        particleCount: 250,
        angle: 120,
        spread: 80,
        origin: { x: 1 },
      });
    }, 400);

    return;
  }

  // 🥇 20% OFF
  if (prizeCode === "TOWEL20") {
    confetti({
      particleCount: 250,
      spread: 140,
      startVelocity: 60,
      origin: { y: 0.6 },
    });

    return;
  }

  // 🥈 10% OFF
  if (prizeCode === "TOWEL10") {
    confetti({
      particleCount: 180,
      spread: 120,
      startVelocity: 55,
      origin: { y: 0.6 },
    });

    return;
  }

  // 🎁 Normal Gifts
  confetti({
    particleCount: 120,
    spread: 90,
    startVelocity: 45,
    origin: { y: 0.65 },
  });
}

function maskMobile(mobile) {
  return `${mobile.substring(0, 2)}XXXX${mobile.substring(6)}`;
}

function showResult(prize, mobile) {
  const maskedMobile = maskMobile(mobile);
  resultTitle.textContent = `🎉 Congratulations!`;

  resultDetail.innerHTML = `
<strong>${maskedMobile}</strong><br><br>
You won <strong>${prize.title}</strong><br>
${prize.detail}
`;
  resultDetail.textContent = prize.detail;
  resultCode.textContent = prize.code;
  modal.hidden = false;
  closeModal.focus();
}

function hideResult() {
  modal.hidden = true;

  input.disabled = false;

  input.value = "";

  spinning = false;

  submit.disabled = false;

  submit.querySelector("span").textContent = "UNLOCK MY SPIN";

  input.focus();
}

closeModal.addEventListener('click', hideResult);
doneButton.addEventListener('click', hideResult);
modal.addEventListener('click', event => {
  if (event.target.classList.contains('modal-backdrop')) hideResult();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !modal.hidden) hideResult();
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  const mobile = input.value.trim();

  if (!validMobile(mobile)) {
    setMessage('Please enter a valid 10-digit mobile number.', true);
    input.focus();
    return;
  }
  if (spinning) return;

  spinning = true;
  submit.disabled = true;
  submit.querySelector('span').textContent = 'GETTING YOUR REWARD…';
  setMessage();

  try {
    if (!config?.functionUrl || !config?.publishableKey) {
      throw new Error('Contest configuration is incomplete. Please contact the store.');
    }

    const response = await fetch(config.functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.publishableKey
      },
      body: JSON.stringify({ mobile })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to spin right now.');

    const segmentAngle = 45;
    const targetCenter = data.prizeIndex * segmentAngle;
    const currentNormalized = rotation % 360;
    const adjustment = (360 - targetCenter - currentNormalized) % 360;
    rotation += 7 * 360 + adjustment;
    spinSound.currentTime = 0;
    spinSound.play().catch(() => {});
    wheel.style.transform = `rotate(${rotation}deg)`;

   window.setTimeout(() => {
     spinSound.pause();
     spinSound.currentTime = 0;

     showResult(data.prize, mobile);

     celebrate(data.prize.code);
   }, 7000);
    input.disabled = true;
    submit.querySelector('span').textContent = 'SPIN CLAIMED';
  } catch (error) {
    setMessage(error.message, true);
    submit.disabled = false;
    submit.querySelector('span').textContent = 'UNLOCK MY SPIN';
    spinning = false;
  }
});
