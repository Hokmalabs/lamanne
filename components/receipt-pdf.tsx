import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
    padding: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#0D3B8C",
  },
  logo: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#0D3B8C",
  },
  logoSub: {
    fontSize: 9,
    color: "#6B7280",
    marginTop: 2,
  },
  receiptTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginBottom: 4,
  },
  receiptDate: {
    fontSize: 10,
    color: "#6B7280",
  },
  section: {
    backgroundColor: "#F8F9FC",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#6B7280",
    textTransform: "uppercase",
    marginBottom: 10,
    letterSpacing: 1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  rowLabel: {
    fontSize: 11,
    color: "#6B7280",
  },
  rowValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
  amountBox: {
    backgroundColor: "#0D3B8C",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amountLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
  amountValue: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#FFFFFF",
  },
  progressBar: {
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    height: 8,
    marginTop: 8,
    overflow: "hidden",
  },
  progressFill: {
    borderRadius: 4,
    height: 8,
  },
  footer: {
    marginTop: 30,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 9,
    color: "#9CA3AF",
  },
});

type ReceiptData = {
  paymentId: string;
  amount: number;
  paidAt: string;
  clientName: string;
  clientPhone: string;
  productName: string;
  amountPaid: number;
  totalPrice: number;
};

function formatCFA(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
}

function formatDateFR(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ReceiptDocument({ data }: { data: ReceiptData }) {
  const progress = Math.min(100, Math.round((data.amountPaid / data.totalPrice) * 100));
  const remaining = Math.max(0, data.totalPrice - data.amountPaid);

  return (
    <Document>
      <Page size="A5" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>LAMANNE</Text>
            <Text style={styles.logoSub}>Cotisation progressive — Côte d&apos;Ivoire</Text>
          </View>
          <View>
            <Text style={styles.receiptTitle}>Reçu de versement</Text>
            <Text style={styles.receiptDate}>{formatDateFR(data.paidAt)}</Text>
          </View>
        </View>

        {/* Amount */}
        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Montant versé</Text>
          <Text style={styles.amountValue}>{formatCFA(data.amount)}</Text>
        </View>

        {/* Client info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Nom</Text>
            <Text style={styles.rowValue}>{data.clientName}</Text>
          </View>
          {data.clientPhone && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Téléphone</Text>
              <Text style={styles.rowValue}>{data.clientPhone}</Text>
            </View>
          )}
        </View>

        {/* Product info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cotisation</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Article</Text>
            <Text style={styles.rowValue}>{data.productName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Total déjà payé</Text>
            <Text style={styles.rowValue}>{formatCFA(data.amountPaid)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Reste à payer</Text>
            <Text style={styles.rowValue}>{formatCFA(remaining)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Prix total</Text>
            <Text style={styles.rowValue}>{formatCFA(data.totalPrice)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Progression</Text>
            <Text style={styles.rowValue}>{progress}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress}%` as any,
                  backgroundColor: progress >= 70 ? "#2D9B6F" : progress >= 30 ? "#F5A623" : "#E55353",
                },
              ]}
            />
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Réf : {data.paymentId.slice(0, 8).toUpperCase()}</Text>
          <Text style={styles.footerText}>lamanne.app</Text>
          <Text style={styles.footerText}>© {new Date().getFullYear()} LAMANNE</Text>
        </View>
      </Page>
    </Document>
  );
}
