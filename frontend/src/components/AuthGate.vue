<script setup>
import { ref } from 'vue'
import { setSecret } from '../api'

const emit = defineEmits(['unlocked'])
const code = ref('')

function submit() {
  if (!code.value.trim()) return
  setSecret(code.value.trim())
  emit('unlocked')
}
</script>

<template>
  <div class="auth-gate">
    <h2>กรุณาใส่ Passcode</h2>
    <p class="hint">กรอกครั้งเดียว ระบบจะจำให้บนเครื่องนี้</p>
    <form @submit.prevent="submit">
      <input
        v-model="code"
        type="password"
        placeholder="Passcode"
        autofocus
      />
      <button>ยืนยัน</button>
    </form>
  </div>
</template>

<style scoped>
.auth-gate {
  background: white;
  padding: 2rem 1rem;
  border-radius: 8px;
  text-align: center;
  margin-top: 2rem;
}
.auth-gate h2 { margin-bottom: 0.5rem; color: #06c755; }
.auth-gate .hint { color: #888; font-size: 0.85rem; margin-bottom: 1rem; }
.auth-gate form { display: grid; gap: 0.5rem; max-width: 280px; margin: 0 auto; }
.auth-gate input {
  padding: 0.6rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}
.auth-gate button {
  background: #06c755;
  color: white;
  border: none;
  padding: 0.7rem;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
}
</style>
