import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Shield, 
  Zap, 
  Users, 
  CheckCircle, 
  Star,
  ArrowRight,
  Clock,
  Globe,
  Lock
} from "lucide-react";
// FIX: Removed local import for heroBackground to make the component more portable.
// import heroBackground from "@/assets/hero-background.jpg"; 
import { AuthForm } from "../auth/AuthForm";

interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const features = [
    {
      icon: <FileText className="h-8 w-8 text-primary" />,
      title: "Easy Document Upload",
      description: "Upload PDF documents quickly and securely to our platform"
    },
    {
      icon: <Shield className="h-8 w-8 text-primary" />,
      title: "Bank-Level Security",
      description: "Your documents are protected with enterprise-grade encryption"
    },
    {
      icon: <Zap className="h-8 w-8 text-primary" />,
      title: "Lightning Fast",
      description: "Get documents signed in minutes, not days"
    },
    {
      icon: <Users className="h-8 w-8 text-primary" />,
      title: "Multi-Party Signing",
      description: "Add multiple signers and track progress in real-time"
    },
    {
      icon: <Globe className="h-8 w-8 text-primary" />,
      title: "Sign Anywhere",
      description: "Access and sign documents from any device, anywhere"
    },
    {
      icon: <Lock className="h-8 w-8 text-primary" />,
      title: "Audit Trail",
      description: "Complete audit logs for compliance and legal requirements"
    }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "HR Director",
      company: "TechCorp Inc.",
      content: "SignIt has revolutionized our document signing process. What used to take weeks now takes hours.",
      rating: 5
    },
    {
      name: "Michael Chen",
      role: "Legal Counsel",
      company: "StartupLaw",
      content: "The audit trail and security features give us complete confidence in digital signatures.",
      rating: 5
    },
    {
      name: "Emily Rodriguez",
      role: "Operations Manager",
      company: "Global Services",
      content: "Our clients love how easy it is to sign documents. It's improved our customer experience significantly.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">SignIt</span>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">How it Works</a>
            <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">Testimonials</a>
            <Button onClick={onGetStarted} variant="hero" size="lg">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          // FIX: Use a placeholder image for the background for portability.
          style={{ backgroundImage: `url(https://placehold.co/1920x1080/6366f1/ffffff?text=Your+Hero+Image)` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-primary/60" />
        </div>
        <div className="relative container mx-auto px-4 py-24 text-center text-white">
          <Badge className="mb-6 bg-white/20 text-white border-white/30">
            <Star className="h-4 w-4 mr-1" />
            Trusted by 10,000+ businesses
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            Sign Documents
            <br />
            <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
              Securely & Fast
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto">
            The modern way to handle document signatures. Upload, sign, and share PDFs 
            with bank-level security and complete audit trails.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={onGetStarted} variant="hero" size="xl" className="bg-white text-primary hover:bg-white/90">
              Start Signing Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="outline" size="xl" className="border-white/30 text-white bg-white/10 hover:bg-white/20">
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why Choose SignIt?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to streamline your document signing process
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get your documents signed in three simple steps
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                1
              </div>
              <h3 className="text-2xl font-semibold mb-4">Upload Document</h3>
              <p className="text-muted-foreground">
                Upload your PDF document to our secure platform in seconds
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                2
              </div>
              <h3 className="text-2xl font-semibold mb-4">Add Signers</h3>
              <p className="text-muted-foreground">
                Add signers by email and place signature fields where needed
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                3
              </div>
              <h3 className="text-2xl font-semibold mb-4">Send & Track</h3>
              <p className="text-muted-foreground">
                Send for signature and track progress in real-time
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">What Our Customers Say</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Trusted by businesses of all sizes around the world
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6 italic">
                    "{testimonial.content}"
                  </p>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.role} at {testimonial.company}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-primary to-primary-focus text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of businesses already using SignIt to streamline their document workflows
          </p>
          <div className="max-w-md mx-auto">
            <AuthForm />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <FileText className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">SignIt</span>
            </div>
            <div className="flex items-center space-x-6 text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Support</a>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2024 SignIt. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
