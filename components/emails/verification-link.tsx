import React from "react";

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "react-email";

const VerificationCodeEmail = ({
  email = "user@example.com",
  code = "45PFSNUDYW",
}: {
  email?: string;
  code?: string;
}) => {
  return (
    <Html>
      <Head />
      <Preview>Your BONUM login code is {code}</Preview>
      <Tailwind>
        <Body
          className="mx-auto my-auto font-sans"
          style={{ backgroundColor: "#f3f0e6" }}
        >
          <Container
            className="mx-auto my-10 max-w-[600px] border border-solid px-10 py-8"
            style={{
              backgroundColor: "#fffdf7",
              borderColor: "#d9d5ca",
            }}
          >
            <Section>
              <Text
                className="m-0 text-2xl font-bold tracking-[-0.04em]"
                style={{ color: "#14251d" }}
              >
                BONUM
              </Text>
              <Text
                className="mb-0 mt-1 text-[10px] font-semibold uppercase tracking-[0.2em]"
                style={{ color: "#57704b" }}
              >
                A venture studio for GOOD
              </Text>
            </Section>

            <Hr className="my-7" style={{ borderColor: "#e4e0d5" }} />

            <Heading
              className="mx-0 my-0 p-0 text-[30px] font-normal leading-9"
              style={{
                color: "#14251d",
                fontFamily: "Georgia, 'Times New Roman', serif",
              }}
            >
              Welcome back to the work that matters.
            </Heading>
            <Text
              className="mb-0 mt-5 text-sm leading-6"
              style={{ color: "#536057" }}
            >
              Use this single-use code to continue to the private BONUM
              workspace:
            </Text>

            <Section className="my-7">
              <Text
                className="m-0 px-4 py-5 text-center text-2xl font-semibold"
                style={{
                  backgroundColor: "#14251d",
                  color: "#f3f0e6",
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                  letterSpacing: "0.18em",
                }}
              >
                {code}
              </Text>
            </Section>

            <Text className="text-sm leading-6" style={{ color: "#536057" }}>
              The code expires in 15 minutes and can only be used once.
            </Text>
            <Text
              className="mt-4 text-xs leading-5"
              style={{ color: "#707a72" }}
            >
              This email was intended for{" "}
              <span style={{ color: "#14251d" }}>{email}</span>. If you
              didn&apos;t request it, you can safely ignore this message.
            </Text>

            <Hr className="my-7" style={{ borderColor: "#e4e0d5" }} />

            <Section>
              <Text
                className="m-0 text-xs font-semibold uppercase tracking-[0.12em]"
                style={{ color: "#57704b" }}
              >
                Fight poverty · Advance justice · Build what lasts
              </Text>
              <Text
                className="mb-0 mt-2 text-xs leading-5"
                style={{ color: "#8a918b" }}
              >
                BONUM — building the blueprint for a better world.
                <br />
                Private access for the people building what matters.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default VerificationCodeEmail;
