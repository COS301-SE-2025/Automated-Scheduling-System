import * as React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '@/constants/colors';
import Button from './Button';
import DetailModal from './DetailModal';
import { getEventDefinitions, type EventDefinition } from '@/services/eventDefinitions';

interface EventScheduleFormData {
  title: string;
  customEventId: number;
  start: string;
  end: string;
  roomName: string;
  maximumAttendees: number;
  minimumAttendees: number;
  statusName: string;
  color: string;
}

interface EventScheduleFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: EventScheduleFormData) => Promise<void>;
  initialData?: {
    id?: string;
    title?: string;
    start?: string;
    end?: string;
    customEventId?: number;
    roomName?: string;
    maximumAttendees?: number;
    minimumAttendees?: number;
    statusName?: string;
    color?: string;
  };
  presentation?: 'sheet' | 'fullscreen';
}

const EventScheduleFormModal: React.FC<EventScheduleFormModalProps> = ({
  visible,
  onClose,
  onSave,
  initialData,
  presentation = 'sheet'
}) => {
  const [formData, setFormData] = React.useState<EventScheduleFormData>({
    title: '',
    customEventId: 0,
    start: '',
    end: '',
    roomName: '',
    maximumAttendees: 0,
    minimumAttendees: 0,
    statusName: 'Scheduled',
    color: '#3788d8',
  });
  const [errors, setErrors] = React.useState<Partial<Record<keyof EventScheduleFormData, string>>>({});
  const [loading, setLoading] = React.useState(false);
  const [eventDefinitions, setEventDefinitions] = React.useState<EventDefinition[]>([]);
  const [showEventTypePicker, setShowEventTypePicker] = React.useState(false);
  const [showColorPicker, setShowColorPicker] = React.useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = React.useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = React.useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = React.useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = React.useState(false);

  const isEditMode = !!initialData?.id;
  const selectedEventType = eventDefinitions.find(def => def.CustomEventID === formData.customEventId);

  const colors_palette = [
    '#3788d8', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
    '#f97316', '#06b6d4', '#84cc16', '#ec4899', '#6366f1'
  ];

  React.useEffect(() => {
    if (visible) {
      loadEventDefinitions();
      
      if (initialData) {
        setFormData({
          title: initialData.title || '',
          customEventId: initialData.customEventId || 0,
          start: initialData.start || '',
          end: initialData.end || '',
          roomName: initialData.roomName || '',
          maximumAttendees: initialData.maximumAttendees || 0,
          minimumAttendees: initialData.minimumAttendees || 0,
          statusName: initialData.statusName || 'Scheduled',
          color: initialData.color || '#3788d8',
        });
      } else {
        // Set default start/end times (current time + 1 hour)
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
        
        setFormData({
          title: '',
          customEventId: 0,
          start: now.toISOString().slice(0, 16), // Format for datetime-local input
          end: oneHourLater.toISOString().slice(0, 16),
          roomName: '',
          maximumAttendees: 0,
          minimumAttendees: 0,
          statusName: 'Scheduled',
          color: '#3788d8',
        });
      }
      setErrors({});
    }
  }, [visible, initialData]);

  const loadEventDefinitions = async () => {
    try {
      const definitions = await getEventDefinitions();
      setEventDefinitions(definitions);
    } catch (error) {
      Alert.alert('Error', 'Failed to load event types');
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof EventScheduleFormData, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.customEventId || formData.customEventId <= 0) {
      newErrors.customEventId = 'You must select an event type';
    }

    if (!formData.start) {
      newErrors.start = 'Start date is required';
    }

    if (!formData.end) {
      newErrors.end = 'End date is required';
    }

    if (formData.start && formData.end) {
      const startDate = new Date(formData.start);
      const endDate = new Date(formData.end);
      if (endDate <= startDate) {
        newErrors.end = 'End date must be after start date';
      }
    }

    if (formData.maximumAttendees > 0 && formData.minimumAttendees > 0) {
      if (formData.maximumAttendees < formData.minimumAttendees) {
        newErrors.maximumAttendees = 'Maximum attendees cannot be less than minimum';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to save event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateField = <K extends keyof EventScheduleFormData>(
    field: K,
    value: EventScheduleFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const currentStart = new Date(formData.start || new Date());
      const newDate = new Date(selectedDate);
      newDate.setHours(currentStart.getHours());
      newDate.setMinutes(currentStart.getMinutes());
      updateField('start', newDate.toISOString());
    }
  };

  const handleStartTimeChange = (event: any, selectedTime?: Date) => {
    setShowStartTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      const currentStart = new Date(formData.start || new Date());
      const newTime = new Date(currentStart);
      newTime.setHours(selectedTime.getHours());
      newTime.setMinutes(selectedTime.getMinutes());
      updateField('start', newTime.toISOString());
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const currentEnd = new Date(formData.end || new Date());
      const newDate = new Date(selectedDate);
      newDate.setHours(currentEnd.getHours());
      newDate.setMinutes(currentEnd.getMinutes());
      updateField('end', newDate.toISOString());
    }
  };

  const handleEndTimeChange = (event: any, selectedTime?: Date) => {
    setShowEndTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      const currentEnd = new Date(formData.end || new Date());
      const newTime = new Date(currentEnd);
      newTime.setHours(selectedTime.getHours());
      newTime.setMinutes(selectedTime.getMinutes());
      updateField('end', newTime.toISOString());
    }
  };

  return (
    <>
      <DetailModal
        visible={visible}
        onClose={onClose}
        title={isEditMode ? 'Edit Event' : 'Schedule Event'}
        presentation={presentation}
      >
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>
                Event Title <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.title && styles.inputError]}
                value={formData.title}
                onChangeText={(value) => updateField('title', value)}
                placeholder="Enter event title"
                placeholderTextColor={colors.muted}
              />
              {errors.title && (
                <Text style={styles.errorText}>{errors.title}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                Event Type <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={[styles.picker, errors.customEventId && styles.inputError]}
                onPress={() => setShowEventTypePicker(prev => !prev)}
              >
                <Text style={[styles.pickerText, !selectedEventType && styles.pickerPlaceholder]}>
                  {selectedEventType ? selectedEventType.EventName : 'Select event type'}
                </Text>
                <Text style={styles.pickerArrow}>{showEventTypePicker ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {errors.customEventId && (
                <Text style={styles.errorText}>{errors.customEventId}</Text>
              )}
              {showEventTypePicker && (
                <View style={styles.inlinePickerContainer}>
                  <ScrollView style={styles.inlinePickerScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {eventDefinitions.length === 0 ? (
                      <Text style={styles.emptyText}>No event types available</Text>
                    ) : (
                      eventDefinitions.map((definition) => (
                        <TouchableOpacity
                          key={definition.CustomEventID}
                          style={[
                            styles.pickerOption,
                            formData.customEventId === definition.CustomEventID && styles.pickerOptionSelected
                          ]}
                          onPress={() => {
                            updateField('customEventId', definition.CustomEventID);
                            setShowEventTypePicker(false);
                          }}
                        >
                          <Text style={styles.pickerOptionTitle}>{definition.EventName}</Text>
                          <Text style={styles.pickerOptionSubtitle}>{definition.StandardDuration}</Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>
                  Start Date <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[styles.dateTimePicker, errors.start && styles.inputError]}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Text style={styles.dateTimeText}>
                    {formData.start ? new Date(formData.start).toLocaleDateString() : 'Select Date'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>
                  Start Time <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[styles.dateTimePicker, errors.start && styles.inputError]}
                  onPress={() => setShowStartTimePicker(true)}
                >
                  <Text style={styles.dateTimeText}>
                    {formData.start ? new Date(formData.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Select Time'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {errors.start && (
              <Text style={styles.errorText}>{errors.start}</Text>
            )}

            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>
                  End Date <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[styles.dateTimePicker, errors.end && styles.inputError]}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Text style={styles.dateTimeText}>
                    {formData.end ? new Date(formData.end).toLocaleDateString() : 'Select Date'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>
                  End Time <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[styles.dateTimePicker, errors.end && styles.inputError]}
                  onPress={() => setShowEndTimePicker(true)}
                >
                  <Text style={styles.dateTimeText}>
                    {formData.end ? new Date(formData.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Select Time'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {errors.end && (
              <Text style={styles.errorText}>{errors.end}</Text>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Room/Location</Text>
              <TextInput
                style={styles.input}
                value={formData.roomName}
                onChangeText={(value) => updateField('roomName', value)}
                placeholder="Enter room or location"
                placeholderTextColor={colors.muted}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Min Attendees</Text>
                <TextInput
                  style={styles.input}
                  value={String(formData.minimumAttendees)}
                  onChangeText={(value) => updateField('minimumAttendees', parseInt(value) || 0)}
                  placeholder="0"
                  placeholderTextColor={colors.muted}
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Max Attendees</Text>
                <TextInput
                  style={[styles.input, errors.maximumAttendees && styles.inputError]}
                  value={String(formData.maximumAttendees)}
                  onChangeText={(value) => updateField('maximumAttendees', parseInt(value) || 0)}
                  placeholder="0"
                  placeholderTextColor={colors.muted}
                  keyboardType="numeric"
                />
                {errors.maximumAttendees && (
                  <Text style={styles.errorText}>{errors.maximumAttendees}</Text>
                )}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Event Color</Text>
              <TouchableOpacity
                style={styles.colorPicker}
                onPress={() => setShowColorPicker(!showColorPicker)}
              >
                <View style={[styles.colorPreview, { backgroundColor: formData.color }]} />
                <Text style={styles.colorText}>Choose Color</Text>
                <Text style={styles.pickerArrow}>▼</Text>
              </TouchableOpacity>
              {showColorPicker && (
                <View style={styles.colorPalette}>
                  {colors_palette.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        formData.color === color && styles.colorOptionSelected
                      ]}
                      onPress={() => {
                        updateField('color', color);
                        setShowColorPicker(false);
                      }}
                    />
                  ))}
                </View>
              )}
            </View>

            <View style={styles.actions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={onClose}
                disabled={loading}
              />
              <Button
                title={loading ? 'Saving...' : 'Save Event'}
                variant="primary"
                onPress={handleSave}
                disabled={loading}
              />
            </View>
          </View>
        </ScrollView>
      </DetailModal>


      {/* Date Time Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={formData.start ? new Date(formData.start) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleStartDateChange}
        />
      )}

      {showStartTimePicker && (
        <DateTimePicker
          value={formData.start ? new Date(formData.start) : new Date()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleStartTimeChange}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={formData.end ? new Date(formData.end) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleEndDateChange}
        />
      )}

      {showEndTimePicker && (
        <DateTimePicker
          value={formData.end ? new Date(formData.end) : new Date()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleEndTimeChange}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  form: {
    gap: 16,
  },
  field: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  required: {
    color: colors.danger,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  dateTimePicker: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  dateTimeText: {
    fontSize: 16,
    color: colors.text,
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
  },
  picker: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerText: {
    fontSize: 16,
    color: colors.text,
  },
  pickerPlaceholder: {
    color: colors.muted,
  },
  pickerArrow: {
    fontSize: 12,
    color: colors.muted,
  },
  colorPicker: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  colorText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  colorPalette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: colors.text,
  },
  pickerModal: {
    maxHeight: 300,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.muted,
    fontSize: 16,
    marginTop: 20,
  },
  pickerOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerOptionSelected: {
    backgroundColor: `${colors.primary}20`,
  },
  pickerOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  pickerOptionSubtitle: {
    fontSize: 14,
    color: colors.muted,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  inlinePickerContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 240,
    overflow: 'hidden',
  },
  inlinePickerScroll: {
    maxHeight: 240,
  },
});

export default EventScheduleFormModal;