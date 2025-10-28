import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "npm:@react-email/components@0.0.25";
import * as React from "npm:react@18.3.1";

interface DeliveryRequestEmailProps {
  delivererName: string;
  orderDate: string;
  timeSlot: string;
  deliveryAddress: string;
  storeName: string;
  acceptUrl: string;
  rejectUrl: string;
  whatsappUrl: string;
}

export const DeliveryRequestEmail = ({
  delivererName,
  orderDate,
  timeSlot,
  deliveryAddress,
  storeName,
  acceptUrl,
  rejectUrl,
  whatsappUrl,
}: DeliveryRequestEmailProps) => (
  <Html>
    <Head />
    <Preview>Nuova consegna disponibile nella tua zona</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🚚 Nuova Consegna Disponibile</Heading>
        
        <Text style={text}>Ciao {delivererName}!</Text>
        
        <Text style={text}>
          C'è una nuova consegna disponibile nella tua zona. Ecco i dettagli:
        </Text>

        <Section style={detailsBox}>
          <Text style={detailRow}>
            <strong>📅 Data:</strong> {orderDate}
          </Text>
          <Text style={detailRow}>
            <strong>🕐 Orario:</strong> {timeSlot}
          </Text>
          <Text style={detailRow}>
            <strong>🏪 Ritiro:</strong> {storeName}
          </Text>
          <Text style={detailRow}>
            <strong>📍 Consegna:</strong> {deliveryAddress}
          </Text>
        </Section>

        <Text style={text}>
          <strong>Il primo che accetta riceverà l'ordine!</strong>
        </Text>

        <Section style={buttonContainer}>
          <Button href={acceptUrl} style={acceptButton}>
            ✅ Accetta Consegna
          </Button>
          <Button href={whatsappUrl} style={whatsappButton}>
            💬 Accetta su WhatsApp
          </Button>
          <Button href={rejectUrl} style={rejectButton}>
            ❌ Rifiuta
          </Button>
        </Section>

        <Text style={footer}>
          Questa è una notifica automatica. Se non sei interessato, clicca su "Rifiuta".
        </Text>
      </Container>
    </Body>
  </Html>
);

export default DeliveryRequestEmail;

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
};

const h1 = {
  color: "#333",
  fontSize: "28px",
  fontWeight: "bold",
  margin: "40px 0",
  padding: "0 40px",
};

const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "16px 40px",
};

const detailsBox = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  margin: "24px 40px",
  padding: "24px",
  border: "1px solid #e5e7eb",
};

const detailRow = {
  margin: "8px 0",
  fontSize: "15px",
  lineHeight: "24px",
};

const buttonContainer = {
  padding: "24px 40px",
};

const acceptButton = {
  backgroundColor: "#22c55e",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  width: "100%",
  padding: "16px 0",
  marginBottom: "12px",
};

const whatsappButton = {
  backgroundColor: "#25D366",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  width: "100%",
  padding: "16px 0",
  marginBottom: "12px",
};

const rejectButton = {
  backgroundColor: "#ef4444",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  width: "100%",
  padding: "16px 0",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  margin: "24px 40px",
};
