import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { workersApi } from '../../src/api/workers';

const DAYS = [
  { key: 'monday', label: 'Mon', full: 'Monday', num: 0 },
  { key: 'tuesday', label: 'Tue', full: 'Tuesday', num: 1 },
  { key: 'wednesday', label: 'Wed', full: 'Wednesday', num: 2 },
  { key: 'thursday', label: 'Thu', full: 'Thursday', num: 3 },
  { key: 'friday', label: 'Fri', full: 'Friday', num: 4 },
  { key: 'saturday', label: 'Sat', full: 'Saturday', num: 5 },
  { key: 'sunday', label: 'Sun', full: 'Sunday', num: 6 },
];

function timeToMinutes(t) {
  const [h, m] = (t || '00:00').split(':').map(Number);
  return h * 60 + m;
}

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const display = hour % 12 || 12;
  return `${display}:${m} ${ampm}`;
}

function validateTime(t) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

function ShiftModal({ day, existing, onClose, onSaved }) {
  const [startTime, setStartTime] = useState(existing?.start_time || '09:00');
  const [endTime, setEndTime] = useState(existing?.end_time || '17:00');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!validateTime(startTime)) { setError('Enter start time as HH:MM (24-hour)'); return; }
    if (!validateTime(endTime)) { setError('Enter end time as HH:MM (24-hour)'); return; }
    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      setError('End time must be after start time'); return;
    }
    setSaving(true);
    setError('');
    try {
      await workersApi.setShift(day.num, startTime, endTime);
      onSaved();
      onClose();
    } catch {
      setError('Failed to save shift. Please try again.');
    }
    setSaving(false);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {existing ? 'Edit' : 'Add'} Shift — {day.full}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Start Time (24-hr)</Text>
              <TextInput
                style={styles.fieldInput}
                value={startTime}
                onChangeText={setStartTime}
                placeholder="09:00"
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>End Time (24-hr)</Text>
              <TextInput
                style={styles.fieldInput}
                value={endTime}
                onChangeText={setEndTime}
                placeholder="17:00"
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>
          </View>

          <Text style={styles.timeHint}>
            {validateTime(startTime) && validateTime(endTime)
              ? `${formatTime(startTime)} → ${formatTime(endTime)}`
              : 'Use 24-hour format, e.g. 09:00 or 17:30'}
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Shift'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function ShiftsScreen() {
  const navigation = useNavigation();
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingDay, setEditingDay] = useState(null);

  useEffect(() => {
    navigation.setOptions({
      title: 'My Shifts',
      headerShown: true,
      headerBackTitle: 'Back',
      headerStyle: { backgroundColor: '#059669' },
      headerTintColor: '#fff',
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const { data } = await workersApi.getShifts();
      setShifts(data.items || data);
    } catch {}
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const getShift = (dayNum) => shifts.find((s) => s.day_of_week === dayNum);

  const handleDelete = (dayNum, dayKey) => {
    Alert.alert(
      'Remove Shift',
      `Remove shift for ${DAYS.find((d) => d.key === dayKey)?.full}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await workersApi.deleteShift(dayNum);
              setShifts((prev) => prev.filter((s) => s.day_of_week !== dayNum));
            } catch {
              Alert.alert('Error', 'Failed to remove shift.');
            }
          },
        },
      ]
    );
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#059669" size="large" />;

  const totalHours = shifts.reduce((acc, s) => {
    return acc + (timeToMinutes(s.end_time) - timeToMinutes(s.start_time)) / 60;
  }, 0);

  return (
    <View style={styles.container}>
      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryVal}>{shifts.length}</Text>
          <Text style={styles.summaryLabel}>Days Scheduled</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryVal}>{totalHours.toFixed(1)}h</Text>
          <Text style={styles.summaryLabel}>Weekly Hours</Text>
        </View>
      </View>

      {/* Days List */}
      <FlatList
        data={DAYS}
        keyExtractor={(item) => item.key}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />}
        renderItem={({ item: day }) => {
          const shift = getShift(day.num);
          return (
            <View style={styles.dayRow}>
              <View style={[styles.dayCircle, shift && styles.dayCircleActive]}>
                <Text style={[styles.dayLabel, shift && styles.dayLabelActive]}>{day.label}</Text>
              </View>
              <View style={styles.dayInfo}>
                <Text style={styles.dayFull}>{day.full}</Text>
                {shift ? (
                  <Text style={styles.shiftTime}>
                    {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
                  </Text>
                ) : (
                  <Text style={styles.dayOff}>Day off</Text>
                )}
              </View>
              <View style={styles.dayActions}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => setEditingDay(day)}
                >
                  <Ionicons name={shift ? 'pencil' : 'add'} size={18} color="#059669" />
                </TouchableOpacity>
                {shift && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => handleDelete(day.num, day.key)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
        contentContainerStyle={{ paddingBottom: 32 }}
      />

      {/* Modal */}
      {editingDay && (
        <ShiftModal
          day={editingDay}
          existing={getShift(editingDay.num)}
          onClose={() => setEditingDay(null)}
          onSaved={load}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  summary: {
    flexDirection: 'row', backgroundColor: '#059669',
    paddingVertical: 16, paddingHorizontal: 24,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryVal: { fontSize: 26, fontWeight: '800', color: '#fff' },
  summaryLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)', marginVertical: 4 },
  dayRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  dayCircle: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center',
    marginRight: 14,
  },
  dayCircleActive: { backgroundColor: '#d1fae5' },
  dayLabel: { fontSize: 13, fontWeight: '700', color: '#9ca3af' },
  dayLabelActive: { color: '#059669' },
  dayInfo: { flex: 1 },
  dayFull: { fontSize: 15, fontWeight: '600', color: '#111827' },
  shiftTime: { fontSize: 13, color: '#059669', marginTop: 2 },
  dayOff: { fontSize: 13, color: '#d1d5db', marginTop: 2 },
  dayActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center',
  },
  deleteBtn: { backgroundColor: '#fef2f2' },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', padding: 24,
  },
  modal: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  fieldGroup: { flexDirection: 'row', gap: 12 },
  field: { flex: 1 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 16, fontWeight: '600', color: '#111827',
    textAlign: 'center',
  },
  timeHint: { fontSize: 13, color: '#059669', textAlign: 'center', marginTop: 10, marginBottom: 4, fontWeight: '500' },
  error: { color: '#ef4444', fontSize: 13, marginTop: 8, textAlign: 'center' },
  saveBtn: {
    marginTop: 16, backgroundColor: '#059669', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
