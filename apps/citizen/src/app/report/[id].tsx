import { CATEGORY_LABELS, STATUS_LABELS, type CitizenReportDto, type IssueStatus, type TimelineEntry } from '@awaaz/shared';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Check } from 'lucide-react-native';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Loader } from '@/components/Loader';
import { BandLabel, Body, Button, Divider, ErrorText, Heading, Hexagon, Muted } from '@/components/ui';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';
import { color, font, statusSteps } from '@/theme';

function ProgressSteps({ status }: { status: IssueStatus }) {
  const { language } = useLanguage();

  if (status === 'REJECTED') {
    return <Body>{STATUS_LABELS.REJECTED[language]}</Body>;
  }

  const reached = statusSteps.indexOf(status);
  return (
    <View>
      {statusSteps.map((step, index) => {
        const done = index <= reached;
        const isLast = index === statusSteps.length - 1;
        return (
          <View key={step} style={styles.step}>
            <View style={styles.stepMarker}>
              <View style={styles.stepHex}>
                <Hexagon size={26} fill={done ? color.monsoon : color.line} />
                {done && (
                  <View style={styles.stepCheck}>
                    <Check color={color.onAccent} size={14} />
                  </View>
                )}
              </View>
              {!isLast && <View style={[styles.stepLine, index < reached && styles.stepLineDone]} />}
            </View>
            <Text style={[styles.stepLabel, done && styles.stepLabelDone, index === reached && styles.stepLabelCurrent]}>
              {STATUS_LABELS[step][language]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function Timeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <View style={styles.timeline}>
      {[...entries].reverse().map((entry) => (
        <View key={entry.id} style={styles.timelineItem}>
          <Text style={styles.timelineMessage}>{entry.message}</Text>
          {entry.note && <Body>{entry.note}</Body>}
          <Muted>{new Date(entry.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</Muted>
        </View>
      ))}
    </View>
  );
}

function Understanding({ report }: { report: CitizenReportDto }) {
  const { t, language } = useLanguage();
  const { analysis, issue } = report;
  if (!analysis) return null;

  return (
    <View style={styles.card}>
      <Heading>{t.aiRead}</Heading>
      <Body>{analysis.summary}</Body>
      {issue && (
        <View style={styles.field}>
          <Muted>{t.priority}</Muted>
          <BandLabel band={issue.priorityBand} />
        </View>
      )}
      {analysis.dedupe?.decision === 'MERGED' && issue && <Field label={t.duplicate} value={t.alreadyReported(issue.reportCount)} />}
    </View>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Muted>{label}</Muted>
      <Body>{value}</Body>
    </View>
  );
}

function ReportPhoto({ id }: { id: string }) {
  const image = useQuery({ queryKey: ['image', id], queryFn: () => api.image(id) });
  if (!image.data) return null;
  return <Image accessibilityIgnoresInvertColors source={{ uri: image.data.dataUrl }} style={styles.photo} />;
}

export default function ReportDetail() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();

  const report = useQuery({
    queryKey: ['report', id],
    queryFn: () => api.report(id),
    // Fast while analysis runs, then slower while waiting for an officer.
    refetchInterval: (query) => (query.state.data?.processing === false ? 5_000 : 1_500),
  });

  if (report.isError) {
    return (
      <View style={styles.centered}>
        <ErrorText>{report.error.message}</ErrorText>
        <Button kind="quiet" label={t.retry} onPress={() => void report.refetch()} />
      </View>
    );
  }

  const data = report.data;
  if (!data) {
    return (
      <Loader fullScreen />
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
      {data.processing && (
        <View style={styles.processing}>
          <Text style={styles.processingTitle}>{t.checking}</Text>
          <Loader />
        </View>
      )}

      {data.issue && (
        <View style={styles.card}>
          <Heading>{t.whatHappens}</Heading>
          <ProgressSteps status={data.issue.status} />
          {data.issue.teamName && <Field label={t.team} value={data.issue.teamName} />}
        </View>
      )}

      <Understanding report={data} />

      {data.issue && data.issue.timeline.length > 0 && (
        <View style={styles.card}>
          <Heading>{t.updates}</Heading>
          <Timeline entries={data.issue.timeline} />
        </View>
      )}

      <View style={styles.card}>
        <Heading>{t.yourReport}</Heading>
        <Muted>{data.code}</Muted>
        <Body>{data.text}</Body>
        {data.hasImage && <ReportPhoto id={data.id} />}
        {data.address && <Muted>{data.address}</Muted>}
        <Divider />
        <Button kind="quiet" label={t.backHome} onPress={() => router.dismissTo('/')} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: 'center', gap: 12, maxWidth: 620, padding: 20, width: '100%' },
  centered: { alignItems: 'center', flex: 1, gap: 12, justifyContent: 'center', padding: 16 },
  processing: { alignItems: 'center', backgroundColor: color.surface, borderColor: color.line, borderRadius: 16, borderWidth: 1, gap: 4, padding: 16 },
  processingTitle: { color: color.ink, fontFamily: font.semibold, fontSize: 16 },
  card: { backgroundColor: color.surface, borderColor: color.line, borderRadius: 16, borderWidth: 1, gap: 10, padding: 18 },
  field: { gap: 1 },
  photo: { aspectRatio: 4 / 3, borderRadius: 8, width: '100%' },
  step: { flexDirection: 'row', gap: 10, minHeight: 38 },
  stepMarker: { alignItems: 'center', width: 26 },
  stepHex: { alignItems: 'center', height: 26, justifyContent: 'center', width: 26 },
  stepCheck: { position: 'absolute' },
  stepLine: { backgroundColor: color.line, flex: 1, width: 2 },
  stepLineDone: { backgroundColor: color.monsoon },
  stepLabel: { color: color.inkFaint, fontFamily: font.regular, fontSize: 16, lineHeight: 22 },
  stepLabelDone: { color: color.ink },
  stepLabelCurrent: { fontFamily: font.semibold },
  timeline: { gap: 12 },
  timelineItem: { gap: 1 },
  timelineMessage: { color: color.ink, fontFamily: font.medium, fontSize: 16 },
});
