import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Chips, EmptyState, ErrorView, LoadingView, SearchBar } from '../../components/ui';
import { InvoiceCard } from '../../features/invoices/InvoiceCard';
import { useInvoiceList } from '../../hooks/queries';
import { useDebounce } from '../../hooks/useDebounce';
import { getErrorMessage } from '../../api/client';
import { colors, spacing, typography } from '../../theme';
import type { PaymentStatus, SortOrder } from '../../types/models';

type Filter = 'all' | PaymentStatus;

export default function InvoicesScreen() {
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<SortOrder>('newest');
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search.trim());
  const query = useMemo(() => ({ search: debounced || undefined, paymentStatus: filter === 'all' ? undefined : filter, sort }), [debounced, filter, sort]);
  const { data, isLoading, error, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useInvoiceList(query);
  const invoices = data?.pages.flatMap((p) => p.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  return (
    <View style={styles.flex}>
      <View style={styles.toolbar}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search invoice no., customer or mobile" />
        <View style={styles.filterRow}>
          <View style={styles.flex}>
            <Chips<Filter>
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'Paid', label: 'Paid', color: colors.success },
                { value: 'Unpaid', label: 'Unpaid', color: colors.danger },
                { value: 'Partially Paid', label: 'Partial', color: colors.pending },
              ]}
            />
          </View>
          <Pressable style={styles.sort} onPress={() => setSort((s) => (s === 'newest' ? 'oldest' : 'newest'))}>
            <Ionicons name={sort === 'newest' ? 'arrow-down' : 'arrow-up'} size={14} color={colors.primary} />
            <Text style={styles.sortText}>{sort === 'newest' ? 'Newest' : 'Oldest'}</Text>
          </Pressable>
        </View>
        {!isLoading && !error ? <Text style={styles.count}>{total} {total === 1 ? 'invoice' : 'invoices'}</Text> : null}
      </View>
      {isLoading ? (
        <LoadingView label="Loading invoices…" />
      ) : error ? (
        <ErrorView message={getErrorMessage(error)} onRetry={refetch} />
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(i) => i._id}
          renderItem={({ item }) => <InvoiceCard invoice={item} onPress={() => router.push(`/invoices/${item._id}`)} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching && !isFetchingNextPage} onRefresh={() => void refetch()} tintColor={colors.primary} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => hasNextPage && !isFetchingNextPage && void fetchNextPage()}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={styles.more} /> : undefined}
          ListEmptyComponent={
            debounced || filter !== 'all' ? (
              <EmptyState icon="search-outline" title="No matching invoices" message="Try a different search or filter." />
            ) : (
              <EmptyState
                icon="document-text-outline"
                title="No invoices yet"
                message="Open a lead marked Deal Done and tap Generate Invoice."
                actionLabel="View completed deals"
                onAction={() => router.push({ pathname: '/leads', params: { status: 'Deal Done' } })}
              />
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  toolbar: { padding: spacing.lg, paddingBottom: spacing.sm, gap: spacing.md },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sort: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 999, backgroundColor: colors.primaryLight },
  sortText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  count: { ...typography.caption },
  list: { padding: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.xxxl, flexGrow: 1 },
  more: { marginVertical: spacing.lg },
});
