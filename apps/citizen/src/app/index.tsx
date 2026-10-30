import { CATEGORY_LABELS, STATUS_LABELS, type CitizenReportDto } from '@awaaz/shared';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ChevronRight, LogOut, Plus } from 'lucide-react-native';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Body, Button, ErrorText, Heading, Hexagon, Muted } from '@/components/ui';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { color, font, statusSteps } from '@/theme';

function ProgressDots({ report }: { report: CitizenReportDto }) {
  const status = report.issue?.status;
  const reached = status ? statusSteps.indexOf(status) : -1;
  return (
    <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {statusSteps.map((step, index) => (
        <Hexagon key={step} size={13} fill={index <= reached ? color.monsoon : color.line} />
      ))}
    </View>
  );
}

function ReportRow({ report }: { report: CitizenReportDto }) {
  const { language, t } = useLanguage();
  const status = report.issue ? STATUS_LABELS[report.issue.status][language] : t.checking;

  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(`/report/${report.id}`)} style={styles.row}>
      <View style={styles.rowText}>
        <Text numberOfLines={2} style={styles.rowTitle}>
          {report.analysis?.summary ?? report.text}
        </Text>
        <Muted>
          {CATEGORY_LABELS[report.category][language]}, {report.code}
        </Muted>
        <View style={styles.rowStatus}>
          <ProgressDots report={report} />
          <Text style={styles.rowStatusText}>{status}</Text>
        </View>
      </View>
      <ChevronRight color={color.inkFaint} size={20} />
    </Pressable>
  );
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const { t, language, toggleLanguage } = useLanguage();
  const { user, signOut } = useSession();
  const reports = useQuery({ queryKey: ['reports'], queryFn: api.myReports, refetchInterval: 6_000 });

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <View style={styles.brand}>
            <Hexagon size={30} fill={color.mint} />
            <Text style={styles.brandName}>Awaaz</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable accessibilityRole="button" onPress={toggleLanguage} style={styles.headerButton}>
              <Text style={styles.languageText}>{language === 'en' ? 'ಕನ್ನಡ' : 'English'}</Text>
            </Pressable>
            <Pressable accessibilityLabel={t.signOut} accessibilityRole="button" onPress={() => void signOut()} style={styles.headerButton}>
              <LogOut color="#FFFFFF" size={20} />
            </Pressable>
          </View>
        </View>
        <Text style={styles.greeting}>{user?.name}</Text>
        <Button label={t.reportProblem} icon={<Plus color="#FFFFFF" size={20} />} onPress={() => router.push('/report/new')} />
      </View>

      <FlatList
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        data={reports.data}
        keyExtractor={(report) => report.id}
        ListHeaderComponent={<Heading style={styles.listTitle}>{t.myReports}</Heading>}
        ListEmptyComponent={
          reports.isError ? (
            <View style={styles.message}>
              <ErrorText>{t.loadFailed}</ErrorText>
              <Button kind="quiet" label={t.retry} onPress={() => void reports.refetch()} />
            </View>
          ) : reports.isPending ? (
            <ActivityIndicator color={color.monsoon} accessibilityLabel={t.loading} />
          ) : (
            <Body>{t.noReports}</Body>
          )
        }
        refreshControl={<RefreshControl refreshing={reports.isRefetching} onRefresh={() => void reports.refetch()} tintColor={color.monsoon} />}
        renderItem={({ item }) => <ReportRow report={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: color.rain, flex: 1 },
  header: { backgroundColor: color.monsoonDeep, gap: 10, paddingBottom: 16, paddingHorizontal: 16 },
  headerRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  headerActions: { alignItems: 'center', flexDirection: 'row' },
  headerButton: { alignItems: 'center', justifyContent: 'center', minHeight: 44, minWidth: 44, paddingHorizontal: 6 },
  brand: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  brandName: { color: '#FFFFFF', fontFamily: font.bold, fontSize: 22 },
  languageText: { color: '#FFFFFF', fontFamily: font.medium, fontSize: 15 },
  greeting: { color: '#D8E8E5', fontFamily: font.regular, fontSize: 16 },
  list: { gap: 8, paddingHorizontal: 16, paddingTop: 16 },
  listTitle: { marginBottom: 4 },
  message: { gap: 10 },
  row: { alignItems: 'center', backgroundColor: color.surface, borderRadius: 8, flexDirection: 'row', gap: 8, padding: 14 },
  rowText: { flex: 1, gap: 3 },
  rowTitle: { color: color.ink, fontFamily: font.medium, fontSize: 16, lineHeight: 22 },
  rowStatus: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 4 },
  rowStatusText: { color: color.monsoon, fontFamily: font.medium, fontSize: 14 },
  dots: { flexDirection: 'row', gap: 2 },
});
