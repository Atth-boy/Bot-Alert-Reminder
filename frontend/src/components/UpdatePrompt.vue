<script setup>
import { useRegisterSW } from 'virtual:pwa-register/vue'

const { needRefresh, updateServiceWorker } = useRegisterSW()

function applyUpdate() {
  updateServiceWorker(true)
}

function dismiss() {
  needRefresh.value = false
}
</script>

<template>
  <div v-if="needRefresh" class="update-banner">
    <span>มีเวอร์ชันใหม่</span>
    <button @click="applyUpdate">อัปเดตเลย</button>
    <button class="dismiss" @click="dismiss">ภายหลัง</button>
  </div>
</template>

<style scoped>
.update-banner {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #06c755;
  color: white;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 -2px 8px rgba(0,0,0,0.15);
  z-index: 100;
  padding-bottom: calc(0.75rem + env(safe-area-inset-bottom));
}
.update-banner span { flex: 1; font-size: 0.9rem; font-weight: 500; }
.update-banner button {
  background: white;
  color: #06c755;
  border: none;
  padding: 0.45rem 0.9rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
}
.update-banner .dismiss {
  background: transparent;
  color: white;
  border: 1px solid rgba(255,255,255,0.6);
  font-weight: 400;
}
</style>
