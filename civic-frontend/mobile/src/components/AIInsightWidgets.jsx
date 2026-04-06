import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

const COLORS = {
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray600: '#4B5563',
  gray700: '#374151',
  gray900: '#111827',
  blue50: '#EFF6FF',
  blue100: '#DBEAFE',
  blue600: '#2563EB',
  red50: '#FEE2E2',
  red100: '#FECACA',
  red600: '#DC2626',
  green50: '#DCFCE7',
  green100: '#BBFAD0',
  green600: '#16A34A',
  yellow50: '#FEF3C7',
  yellow100: '#FCD34D',
  yellow600: '#CA8A04',
};

const SEVERITY_COLORS = {
  high: { bg: red50, border: '#FECACA', text: '#991B1B' },
  medium: { bg: yellow50, border: '#FCD34D', text: '#92400E' },
  low: { bg: green50, border: '#BBFAD0', text: '#166534' },
};

const QUALITY_COLORS = {
  good: { bg: green50, border: '#BBFAD0', text: '#166534' },
  partial: { bg: yellow50, border: '#FCD34D', text: '#92400E' },
  poor: { bg: red50, border: '#FECACA', text: '#991B1B' },
};

export function AIClassificationWidget({ issue }) {
  if (!issue.ai_issue_type && !issue.ai_confidence && !issue.ai_suggested_description) {
    return null;
  }

  const confidencePercent = issue.ai_confidence ? Math.round(issue.ai_confidence * 100) : 0;
  const confidenceColor =
    confidencePercent > 80 ? COLORS.green600 : confidencePercent > 60 ? COLORS.yellow600 : COLORS.red600;

  return (
    <View style={[styles.widget, { backgroundColor: COLORS.blue50, borderColor: COLORS.blue100 }]}>
      <Text style={styles.widgetTitle}>AI Classification</Text>

      {issue.ai_issue_type && (
        <View style={styles.row}>
          <Text style={styles.label}>Predicted Type:</Text>
          <Text style={styles.value}>{issue.ai_issue_type}</Text>
        </View>
      )}

      {issue.ai_severity && (
        <View style={styles.row}>
          <Text style={styles.label}>Severity:</Text>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: SEVERITY_COLORS[issue.ai_severity]?.bg || COLORS.gray100,
                borderColor: SEVERITY_COLORS[issue.ai_severity]?.border || COLORS.gray200,
              },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: SEVERITY_COLORS[issue.ai_severity]?.text || COLORS.gray700 },
              ]}
            >
              {issue.ai_severity}
            </Text>
          </View>
        </View>
      )}

      {issue.ai_confidence !== undefined && (
        <View style={styles.row}>
          <Text style={styles.label}>Confidence:</Text>
          <View style={styles.confidenceContainer}>
            <View style={styles.confidenceBar}>
              <View
                style={[
                  styles.confidenceFill,
                  { width: `${confidencePercent}%`, backgroundColor: confidenceColor },
                ]}
              />
            </View>
            <Text style={[styles.confidenceText, { color: confidenceColor }]}>
              {confidencePercent}%
            </Text>
          </View>
        </View>
      )}

      {issue.ai_suggested_description && (
        <View style={styles.descriptionContainer}>
          <Text style={styles.label}>AI Summary:</Text>
          <View style={styles.descriptionBox}>
            <Text style={styles.descriptionText}>{issue.ai_suggested_description}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

export function AIResolutionWidget({ issue }) {
  if (issue.ai_is_resolved === undefined && !issue.ai_resolution_quality && !issue.ai_resolution_notes) {
    return null;
  }

  const qualityColor = QUALITY_COLORS[issue.ai_resolution_quality] || { bg: COLORS.gray100, border: COLORS.gray200, text: COLORS.gray700 };

  return (
    <View style={[styles.widget, { backgroundColor: qualityColor.bg, borderColor: qualityColor.border }]}>
      <Text style={styles.widgetTitle}>Resolution Verification</Text>

      {issue.ai_is_resolved !== undefined && (
        <View style={styles.row}>
          <Text style={styles.label}>Status:</Text>
          <Text style={[styles.value, { color: issue.ai_is_resolved ? COLORS.green600 : COLORS.red600 }]}>
            {issue.ai_is_resolved ? 'Resolved' : 'Not Resolved'}
          </Text>
        </View>
      )}

      {issue.ai_resolution_quality && (
        <View style={styles.row}>
          <Text style={styles.label}>Quality:</Text>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: qualityColor.bg,
                borderColor: qualityColor.border,
              },
            ]}
          >
            <Text style={[styles.badgeText, { color: qualityColor.text }]}>
              {issue.ai_resolution_quality}
            </Text>
          </View>
        </View>
      )}

      {issue.ai_resolution_notes && (
        <View style={styles.descriptionContainer}>
          <Text style={styles.label}>AI Assessment:</Text>
          <View style={styles.descriptionBox}>
            <Text style={styles.descriptionText}>{issue.ai_resolution_notes}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  widget: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  widgetTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gray900,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray700,
  },
  value: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.blue600,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  confidenceBar: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.gray200,
    borderRadius: 4,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'right',
  },
  descriptionContainer: {
    marginTop: 8,
  },
  descriptionBox: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  descriptionText: {
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.gray700,
  },
});
