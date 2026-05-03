<script setup>
import { ref, onMounted, computed } from 'vue'
import TaskForm from './components/TaskForm.vue'
import TaskList from './components/TaskList.vue'
import AuthGate from './components/AuthGate.vue'
import { fetchTasks, deleteTask, markDone, getSecret, setSecret } from './api'

const tasks = ref([])
const tab = ref('active')
const loading = ref(false)
const error = ref('')
const authed = ref(!!getSecret())

async function refresh() {
  if (!authed.value) return
  loading.value = true
  error.value = ''
  try {
    tasks.value = await fetchTasks()
  } catch (e) {
    if (e.message === 'unauthorized') {
      authed.value = false
      error.value = 'Passcode ไม่ถูกต้อง กรุณาใส่ใหม่'
    } else {
      error.value = e.message
    }
  } finally {
    loading.value = false
  }
}

async function handleDelete(row) {
  if (!confirm('ลบรายการนี้?')) return
  try {
    await deleteTask(row)
    await refresh()
  } catch (e) {
    error.value = e.message
  }
}

async function handleDone(row) {
  if (!confirm('ทำเครื่องหมายว่าเสร็จแล้ว?')) return
  try {
    await markDone(row)
    await refresh()
  } catch (e) {
    error.value = e.message
  }
}

function logout() {
  setSecret('')
  authed.value = false
  tasks.value = []
}

const active = computed(() =>
  tasks.value.filter(t => t.Is_Expired !== 'Expired' && t.Status !== 'Done')
)
const archive = computed(() =>
  tasks.value.filter(t => t.Is_Expired === 'Expired' || t.Status === 'Done')
)

onMounted(refresh)
</script>

<template>
  <div class="container">
    <header>
      <h1>ระบบแจ้งเตือน LINE</h1>
      <button v-if="authed" class="logout" @click="logout">Logout</button>
    </header>

    <AuthGate v-if="!authed" @unlocked="authed = true; refresh()" />

    <template v-else>
      <TaskForm @added="refresh" />

      <nav class="tabs">
        <button :class="{ active: tab === 'active' }" @click="tab = 'active'">
          ระหว่างใช้งาน ({{ active.length }})
        </button>
        <button :class="{ active: tab === 'archive' }" @click="tab = 'archive'">
          เสร็จแล้ว / ผ่าน Due Date ({{ archive.length }})
        </button>
      </nav>

      <div v-if="error" class="error">{{ error }}</div>
      <div v-else-if="loading" class="loading">กำลังโหลด...</div>
      <TaskList
        v-else
        :tasks="tab === 'active' ? active : archive"
        @delete="handleDelete"
        @done="handleDone"
      />
    </template>
  </div>
</template>

<style scoped>
header { display: flex; justify-content: space-between; align-items: center; }
.logout {
  background: transparent;
  border: 1px solid #ddd;
  padding: 0.3rem 0.7rem;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #666;
  cursor: pointer;
}
</style>
