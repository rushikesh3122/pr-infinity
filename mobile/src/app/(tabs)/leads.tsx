import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Chips, EmptyState, ErrorView, Fab, LoadingView, SearchBar } from '../../components/ui';
import { LeadCard } from '../../features/leads/LeadCard';
import { useLeadList } from '../../hooks/queries';
import { useDebounce } from '../../hooks/useDebounce';
import { getErrorMessage } from '../../api/client';
import { colors, spacing, typography } from '../../theme';
import type { LeadStatus, SortOrder } from '../../types/models';

type Filter = 'all' | LeadStatus;

export default function LeadsScreen() {
  const params = useLocalSearchParams<{ status?: string }>();
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<SortOrder>('newest');
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search.trim());

  // Dashboard cards deep-link here with a status filter.
  useEffect(() => {
    if (params.status === 'Pending' || params.status === 'Deal Done') setFilter(params.status);
    else if (params.status === undefined) setFilter('all');
  }, [params.status]);

  const query = useMemo(() => ({ search: debounced || undefined, status: filter === 'all' ? undefined : filter, sort }), [debounced, filter, sort]);
  const { data, isLoading, error, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useLeadList(query);
  const leads = data?.pages.flatMap((p) => p.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  return (
    <View style={styles.flex}>
      <View style={styles.toolbar}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search by name or mobile number" />
        <View style={styles.filterRow}>
          <View style={styles.flex}>
            <Chips<Filter>
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'Pending', label: 'Pending', color: colors.pending },
                { value: 'Deal Done', label: 'Deal Done', color: colors.success },
              ]}
            />
          </View>
          <Pressable style={styles.sort} onPress={() => setSort((s) => (s === 'newest' ? 'oldest' : 'newest'))} accessibilityRole="button">
            <Ionicons name={sort === 'newest' ? 'arrow-down' : 'arrow-up'} size={14} color={colors.primary} />
            <Text style={styles.sortText}>{sort === 'newest' ? 'Newest' : 'Oldest'}</Text>
          </Pressable>
        </View>
        {!isLoading && !error ? <Text style={styles.count}>{total} {total === 1 ? 'lead' : 'leads'}</Text> : null}
      </View>

      {isLoading ? (
        <LoadingView label="Loading leads…" />
      ) : error ? (
        <ErrorView message={getErrorMessage(error)} onRetry={refetch} />
      ) : (
        <FlatList
          data={leads}
          keyExtractor={(l) => l._id}
          renderItem={({ item }) => <LeadCard lead={item} onPress={() => router.push(`/leads/${item._id}`)} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching && !isFetchingNextPage} onRefresh={() => void refetch()} tintColor={colors.primary} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => hasNextPage && !isFetchingNextPage && void fetchNextPage()}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={styles.more} /> : undefined}
          ListEmptyComponent={
            debounced || filter !== 'all' ? (
              <EmptyState icon="search-outline" title="No matching leads" message="Try a different name, number or filter." />
            ) : (
              <EmptyState icon="person-add-outline" title="No leads yet" message="Add your first customer to start tracking deals." actionLabel="Add lead" onAction={() => router.push('/leads/new')} />
            )
          }
        />
      )}
      <Fab label="Add new lead" onPress={() => router.push('/leads/new')} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  toolbar: { padding: spacing.lg, paddingBottom: spacing.sm, gap: spacing.md, backgroundColor: colors.background },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sort: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 999, backgroundColor: colors.primaryLight },
  sortText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  count: { ...typography.caption },
  list: { padding: spacing.lg, paddingTop: spacing.xs, paddingBottom: 100, flexGrow: 1 },
  more: { marginVertical: spacing.lg },
});
