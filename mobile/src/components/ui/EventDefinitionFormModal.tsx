import * as React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { colors } from '@/constants/colors';
import Button from './Button';
import DetailModal from './DetailModal';

interface EventDefinitionFormData {
  EventName: string;
  ActivityDescription: string;
  durationAmount: number;
  durationUnit: 'minutes' | 'hours' | 'days';
  Facilitator: string;
}

interface EventDefinitionFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: EventDefinitionFormData) => Promise<void>;
  onDelete?: () => Promise<void>;
  initialData?: {
    CustomEventID?: number;
    EventName?: string;
    ActivityDescription?: string;
    StandardDuration?: string;
    Facilitator?: string;
  };
}

const EventDefinitionFormModal: React.FC<EventDefinitionFormModalProps> = ({
  visible,
  onClose,
  onSave,
  onDelete,
  initialData
}) => {
  const [formData, setFormData] = React.useState<EventDefinitionFormData>({
    EventName: '',
    ActivityDescription: '',
    durationAmount: 1,
    durationUnit: 'hours',
    Facilitator: '',
  });
  const [errors, setErrors] = React.useState<Partial<Record<keyof EventDefinitionFormData, string>>>({});
  const [loading, setLoading] = React.useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = React.useState(false);

  const isEditMode = !!initialData;

  React.useEffect(() => {
    if (visible) {
      if (initialData) {
        // Parse duration from string like "2 hours" or "30 minutes"
        const parseDuration = (value?: string): { amount: number; unit: 'minutes' | 'hours' | 'days' } => {
          if (!value) return { amount: 1, unit: 'hours' };
          const match = value.match(/([0-9]+(?:\.[0-9]+)?)\s*(minutes?|hours?|days?|m|h|d)/i);
          if (match) {
            const amt = parseFloat(match[1]) || 1;
            const rawUnit = match[2].toLowerCase();
            const unit = rawUnit.startsWith('m') && rawUnit !== 'months' ? 'minutes'
              : rawUnit.startsWith('h') ? 'hours'
              : 'days';
            return { amount: amt, unit } as const;
          }
          return { amount: 1, unit: 'hours' };
        };

        const parsed = parseDuration(initialData.StandardDuration);
        setFormData({
          EventName: initialData.EventName || '',
          ActivityDescription: initialData.ActivityDescription || '',
          durationAmount: parsed.amount,
          durationUnit: parsed.unit,
          Facilitator: initialData.Facilitator || '',
        });
      } else {
        setFormData({
          EventName: '',
          ActivityDescription: '',
          durationAmount: 1,
          durationUnit: 'hours',
          Facilitator: '',
        });
      }
      setErrors({});
    }
  }, [visible, initialData, onDelete]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof EventDefinitionFormData, string>> = {};

    if (!formData.EventName.trim()) {
      newErrors.EventName = 'Event name is required';
    }

    if (formData.durationAmount <= 0) {
      newErrors.durationAmount = 'Duration must be greater than 0';
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
      Alert.alert('Error', 'Failed to save event definition. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    if (!onDelete) return;
    
    setShowDeleteConfirmation(false);
    setLoading(true);
    
    try {
      await onDelete();
      onClose();
    } catch (error) {
      console.error('Delete failed:', error);
      Alert.alert('Error', 'Failed to delete event definition. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirmation(false);
  };

  const updateField = <K extends keyof EventDefinitionFormData>(
    field: K,
    value: EventDefinitionFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <DetailModal
      visible={visible}
      onClose={onClose}
      title={isEditMode ? 'Edit Event Definition' : 'Create Event Definition'}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>
              Event Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.EventName && styles.inputError]}
              value={formData.EventName}
              onChangeText={(value) => updateField('EventName', value)}
              placeholder="Enter event name"
              placeholderTextColor={colors.muted}
            />
            {errors.EventName && (
              <Text style={styles.errorText}>{errors.EventName}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.textArea, errors.ActivityDescription && styles.inputError]}
              value={formData.ActivityDescription}
              onChangeText={(value) => updateField('ActivityDescription', value)}
              placeholder="Enter event description"
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>
              Duration <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.durationContainer}>
              <TextInput
                style={[styles.durationInput, errors.durationAmount && styles.inputError]}
                value={String(formData.durationAmount)}
                onChangeText={(value) => {
                  const num = parseFloat(value) || 0;
                  updateField('durationAmount', num);
                }}
                placeholder="1"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
              />
              <View style={styles.unitSelector}>
                {(['minutes', 'hours', 'days'] as const).map((unit) => (
                  <TouchableOpacity
                    key={unit}
                    style={[
                      styles.unitButton,
                      formData.durationUnit === unit && styles.unitButtonActive
                    ]}
                    onPress={() => updateField('durationUnit', unit)}
                  >
                    <Text style={[
                      styles.unitButtonText,
                      formData.durationUnit === unit && styles.unitButtonTextActive
                    ]}>
                      {unit}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {errors.durationAmount && (
              <Text style={styles.errorText}>{errors.durationAmount}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Facilitator</Text>
            <TextInput
              style={[styles.input, errors.Facilitator && styles.inputError]}
              value={formData.Facilitator}
              onChangeText={(value) => updateField('Facilitator', value)}
              placeholder="Enter facilitator name"
              placeholderTextColor={colors.muted}
            />
          </View>

          <View style={styles.actions}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={onClose}
              disabled={loading}
            />
            {isEditMode && (
              <Button
                title="Delete"
                variant="danger"
                onPress={handleDelete}
                disabled={loading || !onDelete}
              />
            )}
            <Button
              title={loading ? 'Saving...' : isEditMode ? 'Update Definition' : 'Save Definition'}
              variant="primary"
              onPress={handleSave}
              disabled={loading}
            />
          </View>
        </View>
      </ScrollView>

      {/* Custom Delete Confirmation Modal */}
      <DetailModal
        visible={showDeleteConfirmation}
        onClose={cancelDelete}
        title="Delete Event Definition"
      >
        <View style={styles.confirmationContainer}>
          <Text style={styles.confirmationText}>
            Are you sure you want to delete this event definition?
          </Text>
          <Text style={styles.confirmationSubtext}>
            This action cannot be undone.
          </Text>
          
          <View style={styles.confirmationActions}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={cancelDelete}
              disabled={loading}
            />
            <Button
              title={loading ? 'Deleting...' : 'Delete'}
              variant="danger"
              onPress={confirmDelete}
              disabled={loading}
            />
          </View>
        </View>
      </DetailModal>
    </DetailModal>
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
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
  },
  durationContainer: {
    gap: 8,
  },
  durationInput: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    width: 80,
  },
  unitSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  unitButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  unitButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  unitButtonTextActive: {
    color: 'white',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  confirmationContainer: {
    padding: 16,
    gap: 16,
  },
  confirmationText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '600',
  },
  confirmationSubtext: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
  confirmationActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginTop: 8,
  },
});

export default EventDefinitionFormModal;