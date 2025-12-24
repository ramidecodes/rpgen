import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="container py-16 md:py-24">
          <div className="mx-auto max-w-4xl">
            <h1 className="mb-8 font-bold text-4xl md:text-5xl">
              Privacy Policy
            </h1>
            <p className="mb-8 text-muted-foreground">
              Last updated: {new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>

            {/* Introduction */}
            <section className="mb-16">
              <Card>
                <CardHeader>
                  <CardTitle>Introduction</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-muted-foreground">
                    Rami Labs ("we," "our," or "us") operates RPGen, a web-based
                    role-playing game platform. This Privacy Policy explains how
                    we collect, use, disclose, and safeguard your information
                    when you use our service.
                  </p>
                  <p className="text-muted-foreground">
                    By using RPGen, you agree to the collection and use of
                    information in accordance with this policy. If you do not
                    agree with our policies and practices, please do not use our
                    service.
                  </p>
                </CardContent>
              </Card>
            </section>

            {/* Information We Collect */}
            <section className="mb-16">
              <h2 className="mb-6 font-semibold text-3xl">
                Information We Collect
              </h2>
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>
                      Information you provide directly to us
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                      <li>
                        <strong className="font-title text-foreground">
                          Account Information:
                        </strong>{" "}
                        Email address, username, and authentication credentials
                        managed through our authentication provider
                      </li>
                      <li>
                        <strong className="font-title text-foreground">
                          Profile Information:
                        </strong>{" "}
                        User profile data, preferences, and settings
                      </li>
                      <li>
                        <strong className="font-title text-foreground">
                          Game Content:
                        </strong>{" "}
                        Characters, campaigns, universes, runs, and other
                        content you create within the platform
                      </li>
                      <li>
                        <strong className="font-title text-foreground">
                          Communication Data:
                        </strong>{" "}
                        Messages, chat logs, and interactions within the game
                        platform
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Automatically Collected Information</CardTitle>
                    <CardDescription>
                      Information collected automatically when you use our
                      service
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                      <li>
                        <strong className="font-title text-foreground">
                          Usage Data:
                        </strong>{" "}
                        Information about how you access and use RPGen,
                        including IP address, browser type, device information,
                        and usage patterns
                      </li>
                      <li>
                        <strong className="font-title text-foreground">
                          Cookies and Tracking:
                        </strong>{" "}
                        We use cookies and similar tracking technologies to
                        track activity on our service and store certain
                        information
                      </li>
                      <li>
                        <strong className="font-title text-foreground">
                          Log Data:
                        </strong>{" "}
                        Server logs, including timestamps, access times, and
                        error information
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* How We Use Your Information */}
            <section className="mb-16">
              <h2 className="mb-6 font-semibold text-3xl">
                How We Use Your Information
              </h2>
              <Card>
                <CardContent className="pt-6">
                  <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                    <li>To provide, maintain, and improve our service</li>
                    <li>To process transactions and manage your account</li>
                    <li>To personalize your experience and deliver content</li>
                    <li>To communicate with you about your account and service updates</li>
                    <li>To detect, prevent, and address technical issues</li>
                    <li>To comply with legal obligations and enforce our terms</li>
                    <li>To analyze usage patterns and improve our platform</li>
                  </ul>
                </CardContent>
              </Card>
            </section>

            {/* Third-Party Services */}
            <section className="mb-16">
              <h2 className="mb-6 font-semibold text-3xl">
                Third-Party Services
              </h2>
              <Card>
                <CardHeader>
                  <CardTitle>Service Providers</CardTitle>
                  <CardDescription>
                    We use third-party services to operate and improve RPGen
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                    <li>
                      <strong className="font-title text-foreground">
                        Authentication:
                      </strong>{" "}
                      Clerk provides user authentication and account management
                      services. Their privacy policy applies to authentication
                      data.
                    </li>
                    <li>
                      <strong className="font-title text-foreground">
                        Database and Storage:
                      </strong>{" "}
                      Supabase provides database hosting and file storage
                      services. Your game data is stored securely on Supabase
                      infrastructure.
                    </li>
                    <li>
                      <strong className="font-title text-foreground">
                        Payments:
                      </strong>{" "}
                      Stripe processes payment transactions. Payment information
                      is handled by Stripe in accordance with their privacy
                      policy and PCI DSS compliance.
                    </li>
                    <li>
                      <strong className="font-title text-foreground">
                        AI Services:
                      </strong>{" "}
                      We use AI inference services (via Vercel AI SDK) to power
                      game narration and content generation. Your game
                      interactions may be processed by these services.
                    </li>
                    <li>
                      <strong className="font-title text-foreground">
                        Image Generation:
                      </strong>{" "}
                      Replicate may be used for visual scene generation. Images
                      generated through this service are stored securely.
                    </li>
                  </ul>
                  <p className="mt-4 text-muted-foreground">
                    These third-party services have their own privacy policies
                    governing the collection and use of your information. We
                    encourage you to review their privacy policies.
                  </p>
                </CardContent>
              </Card>
            </section>

            {/* Data Storage and Security */}
            <section className="mb-16">
              <h2 className="mb-6 font-semibold text-3xl">
                Data Storage and Security
              </h2>
              <Card>
                <CardContent className="pt-6">
                  <p className="mb-4 text-muted-foreground">
                    We implement appropriate technical and organizational
                    measures to protect your personal information. However, no
                    method of transmission over the Internet or electronic
                    storage is 100% secure. While we strive to use commercially
                    acceptable means to protect your data, we cannot guarantee
                    absolute security.
                  </p>
                  <p className="text-muted-foreground">
                    Your data is stored on secure servers provided by our
                    third-party service providers, who maintain industry-standard
                    security practices.
                  </p>
                </CardContent>
              </Card>
            </section>

            {/* Your Rights */}
            <section className="mb-16">
              <h2 className="mb-6 font-semibold text-3xl">Your Rights</h2>
              <Card>
                <CardContent className="pt-6">
                  <p className="mb-4 text-muted-foreground">
                    Depending on your location, you may have certain rights
                    regarding your personal information, including:
                  </p>
                  <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                    <li>
                      <strong className="font-title text-foreground">
                        Access:
                      </strong>{" "}
                      Request access to your personal information
                    </li>
                    <li>
                      <strong className="font-title text-foreground">
                        Correction:
                      </strong>{" "}
                      Request correction of inaccurate or incomplete information
                    </li>
                    <li>
                      <strong className="font-title text-foreground">
                        Deletion:
                      </strong>{" "}
                      Request deletion of your personal information
                    </li>
                    <li>
                      <strong className="font-title text-foreground">
                        Portability:
                      </strong>{" "}
                      Request transfer of your data to another service
                    </li>
                    <li>
                      <strong className="font-title text-foreground">
                        Objection:
                      </strong>{" "}
                      Object to processing of your personal information
                    </li>
                    <li>
                      <strong className="font-title text-foreground">
                        Withdrawal:
                      </strong>{" "}
                      Withdraw consent where processing is based on consent
                    </li>
                  </ul>
                  <p className="mt-4 text-muted-foreground">
                    To exercise these rights, please contact us using the
                    information provided in the Contact section below.
                  </p>
                </CardContent>
              </Card>
            </section>

            {/* Cookies */}
            <section className="mb-16">
              <h2 className="mb-6 font-semibold text-3xl">Cookies</h2>
              <Card>
                <CardContent className="pt-6">
                  <p className="mb-4 text-muted-foreground">
                    We use cookies and similar tracking technologies to track
                    activity on our service and hold certain information.
                    Cookies are files with a small amount of data that may
                    include an anonymous unique identifier.
                  </p>
                  <p className="text-muted-foreground">
                    You can instruct your browser to refuse all cookies or to
                    indicate when a cookie is being sent. However, if you do not
                    accept cookies, you may not be able to use some portions of
                    our service.
                  </p>
                </CardContent>
              </Card>
            </section>

            {/* Data Retention */}
            <section className="mb-16">
              <h2 className="mb-6 font-semibold text-3xl">Data Retention</h2>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">
                    We retain your personal information for as long as necessary
                    to fulfill the purposes outlined in this Privacy Policy,
                    unless a longer retention period is required or permitted by
                    law. When you delete your account, we will delete or
                    anonymize your personal information, except where we are
                    required to retain it for legal purposes.
                  </p>
                </CardContent>
              </Card>
            </section>

            {/* Children's Privacy */}
            <section className="mb-16">
              <h2 className="mb-6 font-semibold text-3xl">
                Children's Privacy
              </h2>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">
                    Our service is not intended for children under the age of
                    13. We do not knowingly collect personal information from
                    children under 13. If you are a parent or guardian and
                    believe your child has provided us with personal
                    information, please contact us immediately.
                  </p>
                </CardContent>
              </Card>
            </section>

            {/* Changes to This Policy */}
            <section className="mb-16">
              <h2 className="mb-6 font-semibold text-3xl">
                Changes to This Privacy Policy
              </h2>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">
                    We may update our Privacy Policy from time to time. We will
                    notify you of any changes by posting the new Privacy Policy
                    on this page and updating the "Last updated" date. You are
                    advised to review this Privacy Policy periodically for any
                    changes.
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
                    If you have any questions about this Privacy Policy, please
                    contact us:
                  </p>
                  <p className="text-muted-foreground">
                    <strong className="font-title text-foreground">
                      Rami Labs
                    </strong>
                    <br />
                    Email: privacy@ramilabs.com
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

