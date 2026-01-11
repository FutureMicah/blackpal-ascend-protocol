import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  GraduationCap, Star, Clock, Globe, Calendar, 
  MessageSquare, Video, CheckCircle, Award, Filter,
  Search, ChevronRight, Heart
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Mentor {
  id: string;
  user_id: string;
  name: string;
  avatar: string;
  specialty: string[];
  bio: string;
  hourly_rate: number;
  total_sessions: number;
  average_rating: number;
  is_verified: boolean;
  is_available: boolean;
  languages: string[];
  years_experience: number;
}

const mockMentors: Mentor[] = [
  {
    id: "1",
    user_id: "m1",
    name: "Marcus Chen",
    avatar: "",
    specialty: ["Technical Analysis", "Crypto", "Day Trading"],
    bio: "10+ years trading experience. Specialized in crypto markets and scalping strategies. I've trained over 500 successful traders.",
    hourly_rate: 150,
    total_sessions: 487,
    average_rating: 4.9,
    is_verified: true,
    is_available: true,
    languages: ["English", "Mandarin"],
    years_experience: 10,
  },
  {
    id: "2",
    user_id: "m2",
    name: "Sarah Williams",
    avatar: "",
    specialty: ["Forex", "Risk Management", "Psychology"],
    bio: "Former institutional trader with a passion for teaching. Focus on developing strong trading psychology and risk management habits.",
    hourly_rate: 120,
    total_sessions: 324,
    average_rating: 4.8,
    is_verified: true,
    is_available: true,
    languages: ["English", "Spanish"],
    years_experience: 8,
  },
  {
    id: "3",
    user_id: "m3",
    name: "David Okonkwo",
    avatar: "",
    specialty: ["Options", "Stocks", "Swing Trading"],
    bio: "Options specialist with consistent 40%+ annual returns. I help traders understand complex derivatives in simple terms.",
    hourly_rate: 200,
    total_sessions: 156,
    average_rating: 5.0,
    is_verified: true,
    is_available: false,
    languages: ["English"],
    years_experience: 12,
  },
  {
    id: "4",
    user_id: "m4",
    name: "Aisha Patel",
    avatar: "",
    specialty: ["Beginner Friendly", "Fundamentals", "Long-term"],
    bio: "Patient mentor for beginners. I break down complex concepts into digestible lessons. No question is too basic!",
    hourly_rate: 75,
    total_sessions: 892,
    average_rating: 4.7,
    is_verified: true,
    is_available: true,
    languages: ["English", "Hindi", "Gujarati"],
    years_experience: 6,
  },
];

export const MentorMatchingSystem = () => {
  const [mentors, setMentors] = useState<Mentor[]>(mockMentors);
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("all");
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingTopic, setBookingTopic] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const { toast } = useToast();

  const allSpecialties = [...new Set(mentors.flatMap(m => m.specialty))];

  const filteredMentors = mentors.filter(mentor => {
    const matchesSearch = mentor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mentor.specialty.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSpecialty = selectedSpecialty === "all" || 
      mentor.specialty.includes(selectedSpecialty);
    return matchesSearch && matchesSpecialty;
  });

  const toggleFavorite = (mentorId: string) => {
    setFavorites(prev => 
      prev.includes(mentorId) 
        ? prev.filter(id => id !== mentorId)
        : [...prev, mentorId]
    );
  };

  const bookSession = () => {
    if (!selectedMentor || !bookingDate || !bookingTime) return;

    toast({
      title: "Session Booked! 🎉",
      description: `Your session with ${selectedMentor.name} is confirmed for ${bookingDate} at ${bookingTime}`,
    });

    setIsBookingOpen(false);
    setBookingDate("");
    setBookingTime("");
    setBookingTopic("");
    setSelectedMentor(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold flex items-center justify-center gap-2 mb-2">
          <GraduationCap className="w-8 h-8 text-primary" />
          Find Your Mentor
        </h2>
        <p className="text-muted-foreground">
          Connect with experienced traders who will guide your journey
        </p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search mentors..."
            className="pl-10"
          />
        </div>
        <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Specialty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Specialties</SelectItem>
            {allSpecialties.map(spec => (
              <SelectItem key={spec} value={spec}>{spec}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Mentors Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {filteredMentors.map((mentor, index) => (
          <motion.div
            key={mentor.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={cn(
              "overflow-hidden transition-all hover:border-primary/50",
              !mentor.is_available && "opacity-60"
            )}>
              <CardContent className="p-0">
                {/* Top Section */}
                <div className="relative p-6 bg-gradient-to-br from-primary/10 to-transparent">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-4 right-4"
                    onClick={() => toggleFavorite(mentor.id)}
                  >
                    <Heart 
                      className={cn(
                        "w-5 h-5",
                        favorites.includes(mentor.id) && "fill-red-500 text-red-500"
                      )} 
                    />
                  </Button>

                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16 border-2 border-primary/20">
                      <AvatarImage src={mentor.avatar} />
                      <AvatarFallback className="text-lg">
                        {mentor.name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{mentor.name}</h3>
                        {mentor.is_verified && (
                          <CheckCircle className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        {mentor.average_rating} ({mentor.total_sessions} sessions)
                      </div>
                      <Badge variant={mentor.is_available ? "outline" : "secondary"} className="mt-1">
                        {mentor.is_available ? "Available" : "Busy"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="p-6 pt-4 space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {mentor.bio}
                  </p>

                  <div className="flex flex-wrap gap-1">
                    {mentor.specialty.map(spec => (
                      <Badge key={spec} variant="outline" className="text-xs">
                        {spec}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Award className="w-4 h-4" />
                        {mentor.years_experience}y exp
                      </span>
                      <span className="flex items-center gap-1">
                        <Globe className="w-4 h-4" />
                        {mentor.languages.length} lang
                      </span>
                    </div>
                    <span className="text-xl font-bold text-primary">
                      ${mentor.hourly_rate}/hr
                    </span>
                  </div>

                  <Dialog open={isBookingOpen && selectedMentor?.id === mentor.id} onOpenChange={(open) => {
                    setIsBookingOpen(open);
                    if (open) setSelectedMentor(mentor);
                  }}>
                    <DialogTrigger asChild>
                      <Button 
                        className="w-full gap-2" 
                        disabled={!mentor.is_available}
                      >
                        <Calendar className="w-4 h-4" />
                        Book Session
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Book Session with {mentor.name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
                          <Avatar>
                            <AvatarFallback>
                              {mentor.name.split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{mentor.name}</p>
                            <p className="text-sm text-muted-foreground">
                              ${mentor.hourly_rate}/hour
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Date</Label>
                            <Input
                              type="date"
                              value={bookingDate}
                              onChange={(e) => setBookingDate(e.target.value)}
                              min={new Date().toISOString().split("T")[0]}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Time</Label>
                            <Select value={bookingTime} onValueChange={setBookingTime}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select time" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="09:00">9:00 AM</SelectItem>
                                <SelectItem value="10:00">10:00 AM</SelectItem>
                                <SelectItem value="11:00">11:00 AM</SelectItem>
                                <SelectItem value="14:00">2:00 PM</SelectItem>
                                <SelectItem value="15:00">3:00 PM</SelectItem>
                                <SelectItem value="16:00">4:00 PM</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>What would you like to discuss?</Label>
                          <Textarea
                            value={bookingTopic}
                            onChange={(e) => setBookingTopic(e.target.value)}
                            placeholder="Describe your trading challenges or goals..."
                          />
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl bg-primary/10">
                          <span>Session Total</span>
                          <span className="text-2xl font-bold">
                            ${mentor.hourly_rate}
                          </span>
                        </div>

                        <Button 
                          onClick={bookSession} 
                          className="w-full"
                          disabled={!bookingDate || !bookingTime}
                        >
                          Confirm Booking
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredMentors.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No mentors found matching your criteria.
        </div>
      )}
    </div>
  );
};
