import React, { useState, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  ScrollView, TextInput, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { locationsApi } from '../api/locations';
import { authApi } from '../api/auth';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'gu', label: 'ગુજરાતી' },
];

export default function CitizenProfileModal({ visible, onComplete, onCancel, user }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [language, setLanguage] = useState('en');
  const [district, setDistrict] = useState(null);
  const [taluka, setTaluka] = useState(null);
  const [ward, setWard] = useState(null);
  
  const [districts, setDistricts] = useState([]);
  const [talukas, setTalukas] = useState([]);
  const [wards, setWards] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);
  const [showTalukaPicker, setShowTalukaPicker] = useState(false);
  const [showWardPicker, setShowWardPicker] = useState(false);

  // Pre-populate form with existing user data
  useEffect(() => {
    if (!visible || !user) return;
    
    if (user.name) setFullName(user.name);
    if (user.email) setEmail(user.email);
    if (user.language) setLanguage(user.language);
  }, [visible, user?.id]);

  // Load districts and pre-populate existing location on mount
  useEffect(() => {
    if (!visible) return;
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const { data: districtsData } = await locationsApi.getDistricts();
        setDistricts(districtsData || []);
        
        // If user has existing district_id, find and set it
        if (user?.district_id && districtsData) {
          const existingDistrict = districtsData.find(d => d.id === user.district_id);
          if (existingDistrict) {
            setDistrict(existingDistrict);
            
            // Load talukas for this district
            const { data: talukasData } = await locationsApi.getTalukas(existingDistrict.id);
            setTalukas(talukasData || []);
            
            // If user has taluka_id, find and set it
            if (user?.taluka_id && talukasData) {
              const existingTaluka = talukasData.find(t => t.id === user.taluka_id);
              if (existingTaluka) {
                setTaluka(existingTaluka);
                
                // Load wards for this taluka
                const { data: wardsData } = await locationsApi.getWards(existingTaluka.id);
                setWards(wardsData || []);
                
                // If user has ward_id, find and set it
                if (user?.ward_id && wardsData) {
                  const existingWard = wardsData.find(w => w.id === user.ward_id);
                  if (existingWard) {
                    setWard(existingWard);
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        setError('Failed to load location data');
      }
      setLoading(false);
    };
    loadInitialData();
  }, [visible, user?.id]);

  // Load talukas when district changes
  useEffect(() => {
    if (!district) {
      setTalukas([]);
      setTaluka(null);
      setWards([]);
      setWard(null);
      return;
    }
    const loadTalukas = async () => {
      try {
        const { data } = await locationsApi.getTalukas(district.id);
        setTalukas(data || []);
      } catch {
        setTalukas([]);
      }
    };
    loadTalukas();
  }, [district]);

  // Load wards when taluka changes
  useEffect(() => {
    if (!taluka) {
      setWards([]);
      setWard(null);
      return;
    }
    const loadWards = async () => {
      try {
        const { data } = await locationsApi.getWards(taluka.id);
        setWards(data || []);
      } catch {
        setWards([]);
      }
    };
    loadWards();
  }, [taluka]);

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSave = async () => {
    // Validation
    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (!district) {
      setError('Please select a district');
      return;
    }
    if (!taluka) {
      setError('Please select a taluka');
      return;
    }
    if (!ward) {
      setError('Please select a ward');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await authApi.updateProfile({
        name: fullName.trim(),
        email: email.trim(),
        language,
        district_id: district.id,
        taluka_id: taluka.id,
        ward_id: ward.id,
      });
      // Small delay to ensure backend fully processes the update
      await new Promise(resolve => setTimeout(resolve, 500));
      setSaving(false);
      onComplete?.();
    } catch (err) {
      setSaving(false);
      const msg = err.response?.data?.detail || 'Failed to save profile. Please try again.';
      setError(msg);
    }
  };

  if (!visible) return null;

  return (
    <Modal animationType="slide" transparent={true} visible={visible}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.title}>Complete Your Profile</Text>
              <Text style={styles.subtitle}>Fill in all required fields</Text>
            </View>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onCancel}
              disabled={saving}
            >
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centerLoader}>
              <ActivityIndicator size="large" color="#059669" />
            </View>
          ) : (
            <ScrollView
              style={styles.form}
              contentContainerStyle={styles.formContent}
              showsVerticalScrollIndicator={true}
            >
              {/* Full Name */}
              <View style={styles.field}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your name"
                  value={fullName}
                  onChangeText={setFullName}
                  editable={!saving}
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* Email */}
              <View style={styles.field}>
                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  editable={!saving}
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* Language */}
              <View style={styles.field}>
                <Text style={styles.label}>Language *</Text>
                <View style={styles.languageButtons}>
                  {LANGUAGES.map((lang) => (
                    <TouchableOpacity
                      key={lang.code}
                      style={[
                        styles.langBtn,
                        language === lang.code && styles.langBtnActive,
                      ]}
                      onPress={() => setLanguage(lang.code)}
                      disabled={saving}
                    >
                      <Text
                        style={[
                          styles.langBtnText,
                          language === lang.code && styles.langBtnTextActive,
                        ]}
                      >
                        {lang.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* District */}
              <View style={styles.field}>
                <Text style={styles.label}>District *</Text>
                <TouchableOpacity
                  style={styles.picker}
                  onPress={() => setShowDistrictPicker(!showDistrictPicker)}
                  disabled={saving}
                >
                  <Text style={district ? styles.pickerText : styles.pickerPlaceholder}>
                    {district ? district.name : 'Select district'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#6b7280" />
                </TouchableOpacity>
                {showDistrictPicker && (
                  <View style={styles.dropdownList}>
                    <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 150 }}>
                      {districts.map((d) => (
                        <TouchableOpacity
                          key={d.id}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setDistrict(d);
                            setShowDistrictPicker(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{d.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Taluka */}
              <View style={styles.field}>
                <Text style={styles.label}>Taluka *</Text>
                <TouchableOpacity
                  style={[styles.picker, !district && styles.pickerDisabled]}
                  onPress={() => district && setShowTalukaPicker(!showTalukaPicker)}
                  disabled={!district || saving}
                >
                  <Text style={taluka ? styles.pickerText : styles.pickerPlaceholder}>
                    {taluka ? taluka.name : 'Select taluka'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={!district ? '#d1d5db' : '#6b7280'} />
                </TouchableOpacity>
                {showTalukaPicker && (
                  <View style={styles.dropdownList}>
                    <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 150 }}>
                      {talukas.map((t) => (
                        <TouchableOpacity
                          key={t.id}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setTaluka(t);
                            setShowTalukaPicker(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{t.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Ward */}
              <View style={styles.field}>
                <Text style={styles.label}>Ward *</Text>
                <TouchableOpacity
                  style={[styles.picker, !taluka && styles.pickerDisabled]}
                  onPress={() => taluka && setShowWardPicker(!showWardPicker)}
                  disabled={!taluka || saving}
                >
                  <Text style={ward ? styles.pickerText : styles.pickerPlaceholder}>
                    {ward ? `${ward.name} (${ward.ward_number})` : 'Select ward'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={!taluka ? '#d1d5db' : '#6b7280'} />
                </TouchableOpacity>
                {showWardPicker && (
                  <View style={styles.dropdownList}>
                    <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 150 }}>
                      {wards.map((w) => (
                        <TouchableOpacity
                          key={w.id}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setWard(w);
                            setShowWardPicker(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>
                            {w.name} ({w.ward_number})
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Error */}
              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color="#dc2626" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}
            </ScrollView>
          )}

          {/* Save Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving || loading}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Complete</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    maxHeight: '85%',
    minHeight: '70%',
    width: '100%',
    flexShrink: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#fff',
  },
  headerContent: {
    flex: 1,
  },
  cancelBtn: {
    padding: 8,
    marginLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  form: {
    flex: 1,
    paddingHorizontal: 16,
  },
  formContent: {
    paddingTop: 12,
    paddingBottom: 16,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingVertical: 9,
    paddingHorizontal: 11,
    fontSize: 14,
    backgroundColor: '#fff',
    color: '#111827',
  },
  languageButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  langBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  langBtnActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  langBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  langBtnTextActive: {
    color: '#fff',
  },
  picker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 11,
    backgroundColor: '#fff',
  },
  pickerDisabled: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
  },
  pickerText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  pickerPlaceholder: {
    fontSize: 14,
    color: '#9ca3af',
  },
  dropdownList: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    backgroundColor: '#fff',
    maxHeight: 200,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownItemText: {
    fontSize: 13,
    color: '#111827',
  },
  errorBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#fee2e2',
    borderLeftWidth: 3,
    borderLeftColor: '#dc2626',
    padding: 10,
    borderRadius: 4,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#991b1b',
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    backgroundColor: '#fff',
  },
  saveBtn: {
    backgroundColor: '#059669',
    borderRadius: 6,
    paddingVertical: 11,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  centerLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
});
