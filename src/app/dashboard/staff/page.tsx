
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Calendar as CalendarIcon, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, setDoc } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const hours = Math.floor(i / 2);
    const minutes = i % 2 === 0 ? '00' : '30';
    return `${String(hours).padStart(2, '0')}:${minutes}`;
});

interface Availability {
    day: string;
    isWorking: boolean;
    startTime: string;
    endTime: string;
}

interface StaffMember {
  id: string;
  name: string;
  title: string;
  avatarUrl?: string;
  userId: string;
  availability?: Availability[];
}

const defaultAvailability = daysOfWeek.map(day => ({
  day,
  isWorking: day !== "Sunday" && day !== "Saturday", // Default to not working on weekends
  startTime: '09:00',
  endTime: '17:00'
}));

export default function StaffPage() {
  const { user, db } = useAuth();
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStaffDialogOpen, setIsStaffDialogOpen] = useState(false);
  const [isAvailDialogOpen, setIsAvailDialogOpen] = useState(false);
  const [currentStaff, setCurrentStaff] = useState<Partial<StaffMember> | null>(null);
  const [staffAvailability, setStaffAvailability] = useState<Availability[]>(defaultAvailability);

  const fetchStaff = async (userId: string) => {
    if (!db) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
      const q = query(collection(db, "staff"), where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      const staffList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StaffMember));
      setStaff(staffList);
    } catch (error) {
      console.error("Error fetching staff: ", error);
      toast({ title: "Error", description: "Could not fetch staff members.", variant: "destructive" });
    }
    setIsLoading(false);
  };


  useEffect(() => {
    if (user && db) {
      fetchStaff(user.uid);
    } else if (!user) {
        setIsLoading(false);
    }
  }, [user, db]);

  const handleSaveStaff = async () => {
    if (!currentStaff || !currentStaff.name || !currentStaff.title || !user || !db) {
      toast({ title: "Error", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }

    try {
      if (currentStaff.id) {
         const staffData = {
          name: currentStaff.name,
          title: currentStaff.title,
        };
        const staffRef = doc(db, "staff", currentStaff.id);
        await updateDoc(staffRef, staffData);
        toast({ title: "Success", description: "Staff member updated successfully." });
      } else {
        const staffData = {
          name: currentStaff.name,
          title: currentStaff.title,
          avatarUrl: currentStaff.avatarUrl,
          userId: user.uid,
          availability: currentStaff.availability,
        };
        await addDoc(collection(db, "staff"), staffData);
        toast({ title: "Success", description: "Staff member added successfully." });
      }
      fetchStaff(user.uid);
      setIsStaffDialogOpen(false);
      setCurrentStaff(null);
    } catch (error) {
      console.error("Error saving staff member: ", error);
      toast({ title: "Error", description: "Could not save staff member.", variant: "destructive" });
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    if(!user || !db) return;
    try {
      await deleteDoc(doc(db, "staff", staffId));
      toast({ title: "Success", description: "Staff member deleted successfully." });
      fetchStaff(user.uid);
    } catch (error) {
      console.error("Error deleting staff member: ", error);
      toast({ title: "Error", description: "Could not delete staff member.", variant: "destructive" });
    }
  };

  const handleSaveAvailability = async () => {
      if (!currentStaff || !currentStaff.id || !user || !db) return;

      try {
          const staffRef = doc(db, "staff", currentStaff.id);
          await setDoc(staffRef, { availability: staffAvailability }, { merge: true });
          toast({ title: "Success", description: "Availability saved successfully." });
          fetchStaff(user.uid);
          setIsAvailDialogOpen(false);
          setCurrentStaff(null);
      } catch (error) {
          console.error("Error saving availability: ", error);
          toast({ title: "Error", description: "Could not save availability.", variant: "destructive" });
      }
  };
  
  const openAddDialog = () => {
    setCurrentStaff({
      name: "",
      title: "",
      avatarUrl: `https://placehold.co/40x40.png`,
      availability: defaultAvailability,
    });
    setIsStaffDialogOpen(true);
  };

  const openEditDialog = (staffMember: StaffMember) => {
    setCurrentStaff(staffMember);
    setIsStaffDialogOpen(true);
  };

  const openAvailabilityDialog = (staffMember: StaffMember) => {
      const initialAvailability = daysOfWeek.map(day => {
          const existing = staffMember.availability?.find(a => a.day === day);
          return existing || { day, isWorking: true, startTime: '09:00', endTime: '17:00' };
      });
      setStaffAvailability(initialAvailability);
      setCurrentStaff(staffMember);
      setIsAvailDialogOpen(true);
  };

  const updateAvailability = (day: string, field: keyof Availability, value: any) => {
      setStaffAvailability(prev => 
          prev.map(avail => 
              avail.day === day ? { ...avail, [field]: value } : avail
          )
      );
  };


  const TableSkeleton = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Member</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Availability</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...Array(3)].map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-5 w-24" />
              </div>
            </TableCell>
            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
            <TableCell><Skeleton className="h-8 w-32" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div>
      <PageHeader title="Staff" actionButton={<Button onClick={openAddDialog} disabled={isLoading}><PlusCircle className="mr-2" />Add New Staff Member</Button>} />
      
      <Card>
        <CardHeader>
          <CardTitle>Your Team</CardTitle>
        </CardHeader>
        <CardContent>
          { isLoading ? <TableSkeleton /> : staff.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Availability</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                  {staff.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={member.avatarUrl} alt={member.name} data-ai-hint="person portrait" />
                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span>{member.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{member.title}</TableCell>
                       <TableCell>
                          <Button variant="outline" size="sm" onClick={() => openAvailabilityDialog(member)}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              Manage
                          </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(member)}>Edit Info</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openAvailabilityDialog(member)}>Edit Availability</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteStaff(member.id)} className="text-destructive">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          ) : (
              <div className="text-center py-10">
                  <p className="font-semibold">No staff members found.</p>
                  <p className="text-muted-foreground text-sm">Get started by adding your first team member.</p>
                  <Button onClick={openAddDialog} className="mt-4"><PlusCircle className="mr-2" /> Add Staff Member</Button>
              </div>
          )}
        </CardContent>
      </Card>

       <Dialog open={isStaffDialogOpen} onOpenChange={setIsStaffDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentStaff?.id ? "Edit Staff Member" : "Add New Staff Member"}</DialogTitle>
            <DialogDescription>
              Fill in the details for your team member below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={currentStaff?.name || ""} onChange={(e) => setCurrentStaff({ ...currentStaff, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" placeholder="e.g. Barber" value={currentStaff?.title || ""} onChange={(e) => setCurrentStaff({ ...currentStaff, title: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStaffDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveStaff}>Save Member</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAvailDialogOpen} onOpenChange={setIsAvailDialogOpen}>
          <DialogContent className="max-w-2xl">
              <DialogHeader>
                  <DialogTitle>Manage Availability for {currentStaff?.name}</DialogTitle>
                  <DialogDescription>Set the working hours for this staff member. Uncheck a day to mark it as not working.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                  {staffAvailability.map((avail) => (
                      <div key={avail.day} className="grid grid-cols-4 items-center gap-4">
                          <div className="flex items-center space-x-2">
                              <Checkbox 
                                  id={`working-${avail.day}`} 
                                  checked={avail.isWorking}
                                  onCheckedChange={(checked) => updateAvailability(avail.day, 'isWorking', checked)}
                              />
                              <Label htmlFor={`working-${avail.day}`} className="font-medium">{avail.day}</Label>
                          </div>
                          <div className="col-span-3 grid grid-cols-2 gap-2 items-center">
                              <Select 
                                  value={avail.startTime}
                                  onValueChange={(value) => updateAvailability(avail.day, 'startTime', value)}
                                  disabled={!avail.isWorking}
                              >
                                  <SelectTrigger>
                                      <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                      {timeOptions.map(time => <SelectItem key={`start-${time}`} value={time}>{time}</SelectItem>)}
                                  </SelectContent>
                              </Select>
                              <Select
                                  value={avail.endTime}
                                  onValueChange={(value) => updateAvailability(avail.day, 'endTime', value)}
                                  disabled={!avail.isWorking}
                              >
                                  <SelectTrigger>
                                      <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                      {timeOptions.map(time => <SelectItem key={`end-${time}`} value={time}>{time}</SelectItem>)}
                                  </SelectContent>
                              </Select>
                          </div>
                      </div>
                  ))}
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAvailDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveAvailability}>Save Availability</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
}
