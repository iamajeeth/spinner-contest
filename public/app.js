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

function showResult(prize) {
  resultTitle.textContent = prize.title;
  resultDetail.textContent = prize.detail;
  resultCode.textContent = prize.code;
  modal.hidden = false;
  closeModal.focus();
}

function hideResult() {
  modal.hidden = true;
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
    rotation += 5 * 360 + adjustment;
    wheel.style.transform = `rotate(${rotation}deg)`;

    window.setTimeout(() => showResult(data.prize), 5350);
    input.disabled = true;
    submit.querySelector('span').textContent = 'SPIN CLAIMED';
  } catch (error) {
    setMessage(error.message, true);
    submit.disabled = false;
    submit.querySelector('span').textContent = 'UNLOCK MY SPIN';
    spinning = false;
  }
});
