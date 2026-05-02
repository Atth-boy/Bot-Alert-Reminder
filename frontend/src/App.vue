<script setup>
import { ref, onMounted, computed } from 'vue'
import TaskForm from './components/TaskForm.vue'
import TaskList from './components/TaskList.vue'
import { fetchTasks } from './api'

const tasks = ref([])
const tab = ref('active')
const loading = ref(false)
const error = ref('')

async function refresh() {
  loading.value = true
  error.value = ''
  try {
    tasks.value = await fetchTasks()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

const active = computed(() =>
  tasks.value.filter(t => t.Is_Expired !== 'Expired')
)
const expired = computed(() =>
  tasks.value.filter(t => t.Is_Expired === 'Expired')
)

onMounted(refresh)
</script>

<template>
  <div class="container">
    <header>
      <h1>ระบบแจ้งเตือน LINE</h1>
    </header>

    <TaskForm @added="refresh" />

    <nav class="tabs">
      <button :class="{ active: tab === 'active' }" @click="tab = 'active'">
        ระหว่างใช้งาน ({{ active.length }})
      </button>
      <button :class="{ active: tab === 'expired' }" @click="tab = 'expired'">
        ผ่าน Due Date ({{ expired.length }})
      </button>
    </nav>

    <div v-if="error" class="error">{{ error }}</div>
    <div v-else-if="loading" class="loading">กำลังโหลด...</div>
    <TaskList v-else :tasks="tab === 'active' ? active : expired" />
  </div>
</template>
