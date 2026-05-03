<script setup>
import { ref, watch, computed } from 'vue'
import { addTask } from '../api'

const props = defineProps({ recipients: { type: Array, default: () => [] } })
const emit = defineEmits(['added'])

const empty = () => ({
  topic: '',
  detail: '',
  dueDate: '',
  recipient: '',
  notificationDate: '',
  recurrence: 'none'
})

const form = ref(empty())
const saving = ref(false)
const error = ref('')
const manualMode = ref(false)

watch(() => form.value.dueDate, (d) => {
  if (d && !form.value.notificationDate) {
    const date = new Date(d)
    date.setDate(date.getDate() - 1)
    form.value.notificationDate = date.toISOString().slice(0, 10)
  }
})

watch(() => form.value.recipient, (v) => {
  if (v === '__manual__') {
    manualMode.value = true
    form.value.recipient = ''
  }
})

const notifyDay = computed(() => {
  if (!form.value.notificationDate) return '?'
  return new Date(form.value.notificationDate).getDate()
})

function backToList() {
  manualMode.value = false
  form.value.recipient = ''
}

async function submit() {
  saving.value = true
  error.value = ''
  try {
    await addTask(form.value)
    form.value = empty()
    manualMode.value = false
    emit('added')
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form @submit.prevent="submit" class="form">
    <input v-model="form.topic" placeholder="Topic (หัวข้อ)" required />
    <textarea v-model="form.detail" placeholder="รายละเอียด" rows="2"></textarea>

    <label>
      รูปแบบการแจ้งเตือน
      <select v-model="form.recurrence">
        <option value="none">ครั้งเดียว</option>
        <option value="monthly">ทุกเดือน</option>
      </select>
    </label>

    <label>
      {{ form.recurrence === 'monthly' ? 'Due Date (วันสิ้นสุด — ทิ้งว่างได้)' : 'Due Date' }}
      <input
        type="date"
        v-model="form.dueDate"
        :required="form.recurrence === 'none'"
      />
    </label>

    <label>
      ผู้รับ
      <select
        v-if="!manualMode && recipients.length"
        v-model="form.recipient"
        required
      >
        <option value="">-- เลือกผู้รับ ({{ recipients.length }}) --</option>
        <option
          v-for="r in recipients"
          :key="r.id"
          :value="r.id"
        >
          {{ r.type === 'group' ? '[Group] ' : '' }}{{ r.name }}
        </option>
        <option disabled>──────────</option>
        <option value="__manual__">+ พิมพ์ ID เอง</option>
      </select>
      <div v-else class="manual-row">
        <input
          v-model="form.recipient"
          placeholder="LINE User ID / Group ID"
          required
        />
        <button
          v-if="recipients.length"
          type="button"
          class="link"
          @click="backToList"
        >จากรายชื่อ</button>
      </div>
    </label>
    <small v-if="!recipients.length" class="hint">
      ยังไม่มีรายชื่อ — ให้คนทักบอท/เชิญบอทเข้ากลุ่มก่อน ระบบจะเก็บอัตโนมัติ
    </small>

    <label>
      {{ form.recurrence === 'monthly' ? 'วันที่แจ้ง (ใช้วันใน-เดือน)' : 'Notification Date (default: Due Date - 1 วัน)' }}
      <input type="date" v-model="form.notificationDate" :required="form.recurrence === 'monthly'" />
    </label>

    <small v-if="form.recurrence === 'monthly'" class="hint">
      จะแจ้งทุกวันที่ {{ notifyDay }} ของเดือน (เดือนสั้นจะ fallback เป็นวันสุดท้าย)
    </small>

    <button :disabled="saving">{{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}</button>
    <div v-if="error" class="error">{{ error }}</div>
  </form>
</template>

<style scoped>
.hint { color: #666; font-size: 0.8rem; }
select {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  width: 100%;
  background: white;
}
.manual-row { display: flex; gap: 0.3rem; align-items: stretch; }
.manual-row input { flex: 1; }
.link {
  background: transparent;
  border: 1px solid #ddd;
  padding: 0 0.6rem;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #06c755;
  cursor: pointer;
  white-space: nowrap;
}
</style>
