import type { Metadata } from "next";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://rpgen.ramilabs.com";

export function generateMetadata(): Metadata {
  return {
    title: "Terms of Service | RPGen",
    description:
      "RPGen Terms of Service. Read the terms and conditions governing your use of RPGen, a web-based role-playing game platform.",
    keywords: ["terms of service", "terms and conditions", "RPGen", "legal"],
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      type: "website",
      url: `${baseUrl}/terms`,
      siteName: "RPGen",
      title: "Terms of Service | RPGen",
      description:
        "RPGen Terms of Service. Read the terms and conditions governing your use of RPGen, a web-based role-playing game platform.",
      images: [
        {
          url: `${baseUrl}/favicon-96x96.png`,
          width: 96,
          height: 96,
          alt: "RPGen",
        },
      ],
    },
    twitter: {
      card: "summary",
      title: "Terms of Service | RPGen",
      description:
        "RPGen Terms of Service. Read the terms and conditions governing your use of RPGen, a web-based role-playing game platform.",
      images: [`${baseUrl}/favicon-96x96.png`],
    },
  };
}

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="container py-16 md:py-24">
          <div className="mx-auto max-w-4xl">
            <h1 className="mb-8 font-bold text-4xl md:text-5xl">
              Terms of Service
            </h1>
            <p className="mb-8 text-muted-foreground">
              Last updated:{" "}
              {new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>

            {/* Introduction */}
            <section className="mb-16">
              <Card>
                <CardHeader>
                  <CardTitle>Agreement to Terms</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-muted-foreground">
                    These Terms of Service ("Terms") constitute a legally
                    binding agreement between you and Rami Labs ("we," "our," or
                    "us") regarding your use of RPGen, a web-based role-playing
                    game platform (the "Service").
                  </p>
                  <p className="text-muted-foreground">
                    By accessing or using RPGen, you agree to be bound by these
                    Terms. If you disagree with any part of these Terms, then
                    you may not access or use the Service.
                  </p>
                </CardContent>
              </Card>
            </section>

            {/* Service Description */}
            <section className="mb-16">
              <h2 className="mb-6 font-semibold text-3xl">
                Service Description
              </h2>
              <Card>
                <CardContent className="pt-6">
                  <p className="mb-4 text-muted-foreground">
                    RPGen is an AI-driven role-playing game platform that
                    provides:
                  </p>
                  <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                    <li>Procedurally generated game worlds and universes</li>
                    <li>AI-powered game narration and storytelling</li>
                    <li>Character creation and management tools</li>
                    <li>Campaign and run management features</li>
                    <li>Visual scene generation capabilities</li>
                    <li>Interactive gameplay through text-based interfaces</li>
                  </ul>
                  <p className="mt-4 text-muted-foreground">
                    We reserve the right to modify, suspend, or discontinue any
                    aspect of the Service at any time, with or without notice.
                  </p>
                </CardContent>
              </Card>
            </section>

            {/* User Accounts */}
            <section className="mb-16">
              <h2 className="mb-6 font-semibold text-3xl">User Accounts</h2>
              <Card>
                <CardHeader>
                  <CardTitle>Account Requirements</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                    <li>
                      You must be at least 13 years old to create an account
                    </li>
                    <li>
                      You must provide accurate, current, and complete
                      information during registration
                    </li>
                    <li>
                      You are responsible for maintaining the confidentiality of
                      your account credentials
                    </li>
                    <li>
                      You are responsible for all activities that occur under
                      your account
                    </li>
                    <li>
                      You must notify us immediately of any unauthorized use of
                      your account
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </section>

            {/* User Obligations */}
            <section className="mb-16">
              <h2 className="mb-6 font-semibold text-3xl">User Obligations</h2>
              <Card>
                <CardHeader>
                  <CardTitle>Acceptable Use</CardTitle>
                  <CardDescription>
                    You agree to use the Service only for lawful purposes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-muted-foreground">
                    You agree not to:
                  </p>
                  <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                    <li>
                      Violate any applicable laws, regulations, or third-party
                      rights
                    </li>
                    <li>
                      Use the Service to transmit harmful, offensive, or
                      inappropriate content
                    </li>
                    <li>
                      Attempt to gain unauthorized access to the Service or its
                      systems
                    </li>
                    <li>
                      Interfere with or disrupt the Service or servers connected
                      to the Service
                    </li>
                    <li>
                      Use automated systems (bots, scrapers, etc.) to access the
                      Service without permission
                    </li>
                    <li>
                      Reverse engineer, decompile, or disassemble any part of
                      the Service
                    </li>
                    <li>
                      Create multiple accounts to circumvent restrictions or
                      abuse the Service
                    </li>
                    <li>
                      Share your account credentials with others or allow others
                      to access your account
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </section>

            {/* Intellectual Property */}
            <section className="mb-16">
              <h2 className="mb-6 font-semibold text-3xl">
                Intellectual Property
              </h2>
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Service Ownership</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      The Service, including its original content, features, and
                      functionality, is owned by Rami Labs and is protected by
                      international copyright, trademark, patent, trade secret,
                      and other intellectual property laws.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>User Content</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4 text-muted-foreground">
                      You retain ownership of content you create within the
                      Service, including characters, campaigns, universes, and
                      game runs. However, by using the Service, you grant Rami
                      Labs a worldwide, non-exclusive, royalty-free license to:
                    </p>
                    <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                      <li>
                        Store, process, and display your content on the Service
                      </li>
                      <li>
                        Use your content to provide, maintain, and improve the
                        Service
                      </li>
                      <li>Create backups and ensure data availability</li>
                    </ul>
                    <p className="mt-4 text-muted-foreground">
                      You represent and warrant that you have all necessary
                      rights to grant this license and that your content does
                      not infringe upon any third-party rights.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Payments and Subscriptions */}
            <section className="mb-16">
              <h2 className="mb-6 font-semibold text-3xl">
                Payments and Subscriptions
              </h2>
              <Card>
                <CardContent className="pt-6">
                  <p className="mb-4 text-muted-foreground">
                    If you purchase a subscription or make payments through the
                    Service:
                  </p>
                  <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                    <li>You agree to provide accurate payment information</li>
                    <li>
                      Payments are processed by third-party payment processors
                      (e.g., Stripe)
                    </li>
                    <li>
                      Subscription fees are billed in advance on a recurring
                      basis
                    </li>
                    <li>
                      You may cancel your subscription at any time, subject to
                      the terms of your subscription plan
                    </li>
                    <li>
                      Refunds are subject to our refund policy, which may vary
                      by jurisdiction
                    </li>
                    <li>
                      We reserve the right to change our pricing with reasonable
                      notice
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </section>

            {/* Disclaimers */}
            <section className="mb-16">
              <h2 className="mb-6 font-semibold text-3xl">Disclaimers</h2>
              <Card>
                <CardContent className="pt-6">
                  <p className="mb-4 text-muted-foreground">
                    THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT
                    WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING
                    BUT NOT LIMITED TO:
                  </p>
                  <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                    <li>
                      Implied warranties of merchantability, fitness for a
                      particular purpose, and non-infringement
                    </li>
                    <li>
                      Warranties that the Service will be uninterrupted, secure,
                      or error-free
                    </li>
                    <li>
                      Warranties regarding the accuracy, reliability, or quality
                      of any content or information obtained through the Service
                    </li>
                    <li>
                      Warranties that defects will be corrected or that the
                      Service is free of viruses or other harmful components
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </section>

            {/* Limitation of Liability */}
            <section className="mb-16">
              <h2 className="mb-6 font-semibold text-3xl">
                Limitation of Liability
              </h2>
              <Card>
                <CardContent className="pt-6">
                  <p className="mb-4 text-muted-foreground">
                    TO THE MAXIMUM EXTENT PERMITTED BY LAW, RAMI LABS SHALL NOT
                    BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
                    CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT
                    LIMITED TO:
                  </p>
                  <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                    <li>Loss of profits, data, or use</li>
                    <li>Business interruption</li>
                    <li>Personal injury or property damage</li>
                    <li>Loss of goodwill or reputation</li>
                  </ul>
                  <p className="mt-4 text-muted-foreground">
                    Our total liability for any claims arising from or related
                    to the Service shall not exceed the amount you paid to us in
                    the twelve (12) months preceding the claim, or $100,
                    whichever is greater.
                  </p>
                </CardContent>
              </Card>
            </section>

            {/* Indemnification */}
            <section className="mb-16">
              <h2 className="mb-6 font-semibold text-3xl">Indemnification</h2>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">
                    You agree to indemnify, defend, and hold harmless Rami Labs
                    and its officers, directors, employees, and agents from and
                    against any claims, liabilities, damages, losses, and
                    expenses, including reasonable attorneys' fees, arising out
                    of or in any way connected with your use of the Service,
                    your violation of these Terms, or your violation of any
                    third-party rights.
                  </p>
                </CardContent>
              </Card>
            </section>

            {/* Termination */}
            <section className="mb-16">
              <h2 className="mb-6 font-semibold text-3xl">Termination</h2>
              <Card>
                <CardHeader>
                  <CardTitle>Termination Rights</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                    <li>
                      You may terminate your account at any time by contacting
                      us or using account deletion features
                    </li>
                    <li>
                      We may terminate or suspend your account immediately,
                      without prior notice, for conduct that we believe violates
                      these Terms or is harmful to other users, us, or third
                      parties
                    </li>
                    <li>
                      Upon termination, your right to use the Service will cease
                      immediately
                    </li>
                    <li>
                      We may delete your account and associated data after a
                      reasonable period following termination
                    </li>
                    <li>
                      Provisions of these Terms that by their nature should
                      survive termination shall survive, including ownership
                      provisions, warranty disclaimers, and limitations of
                      liability
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </section>

            {/* Governing Law */}
            <section className="mb-16">
              <h2 className="mb-6 font-semibold text-3xl">Governing Law</h2>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">
                    These Terms shall be governed by and construed in accordance
                    with the laws of the jurisdiction in which Rami Labs
                    operates, without regard to its conflict of law provisions.
                    Any disputes arising from or relating to these Terms or the
                    Service shall be subject to the exclusive jurisdiction of
                    the courts in that jurisdiction.
                  </p>
                </CardContent>
              </Card>
            </section>

            {/* Changes to Terms */}
            <section className="mb-16">
              <h2 className="mb-6 font-semibold text-3xl">Changes to Terms</h2>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">
                    We reserve the right to modify or replace these Terms at any
                    time. If a revision is material, we will provide at least 30
                    days' notice prior to any new terms taking effect. What
                    constitutes a material change will be determined at our sole
                    discretion. By continuing to access or use the Service after
                    those revisions become effective, you agree to be bound by
                    the revised terms.
                  </p>
                </CardContent>
              </Card>
            </section>

            {/* Severability */}
            <section className="mb-16">
              <h2 className="mb-6 font-semibold text-3xl">Severability</h2>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">
                    If any provision of these Terms is held to be invalid or
                    unenforceable by a court, the remaining provisions of these
                    Terms will remain in effect. The invalid or unenforceable
                    provision will be replaced with a valid, enforceable
                    provision that most closely matches the intent of the
                    original provision.
                  </p>
                </CardContent>
              </Card>
            </section>

            {/* Contact */}
            <section>
              <h2 className="mb-6 font-semibold text-3xl">Contact Us</h2>
              <Card>
                <CardContent className="pt-6">
                  <p className="mb-4 text-muted-foreground">
                    If you have any questions about these Terms of Service,
                    please contact us:
                  </p>
                  <p className="text-muted-foreground">
                    <strong className="font-title text-foreground">
                      Rami Labs
                    </strong>
                    <br />
                    Email: legal@ramilabs.com
                  </p>
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
