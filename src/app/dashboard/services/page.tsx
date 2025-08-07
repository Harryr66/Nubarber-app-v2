
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth"; // We will create this hook
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";

// Define the Service type
interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
  userId: string;
}

export default function ServicesPage() {
  const { user, db } = useAuth();
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentService, setCurrentService] = useState<Partial<Service> | null>(null);

  const fetchServices = async (userId: string) => {
    if (!db) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
      const q = query(collection(db, "services"), where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      const servicesList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
      setServices(servicesList);
    } catch (error) {
      console.error("Error fetching services: ", error);
      toast({ title: "Error", description: "Could not fetch services.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (user && db) {
      fetchServices(user.uid);
    } else if (!user) {
        setIsLoading(false);
    }
  }, [user, db]);

  const handleSaveService = async () => {
    if (!currentService || !currentService.name || !currentService.duration || !currentService.price === undefined || !user || !db) {
      toast({ title: "Error", description: "Please fill all fields.", variant: "destructive" });
      return;
    }

    const serviceData = {
      name: currentService.name,
      duration: Number(currentService.duration),
      price: Number(currentService.price),
      userId: user.uid,
    };

    try {
      if (currentService.id) {
        // Update existing service
        const serviceRef = doc(db, "services", currentService.id);
        await updateDoc(serviceRef, serviceData);
        toast({ title: "Success", description: "Service updated successfully." });
      } else {
        // Add new service
        await addDoc(collection(db, "services"), serviceData);
        toast({ title: "Success", description: "Service added successfully." });
      }
      fetchServices(user.uid);
      setIsDialogOpen(false);
      setCurrentService(null);
    } catch (error) {
      console.error("Error saving service: ", error);
      toast({ title: "Error", description: "Could not save service.", variant: "destructive" });
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if(!user || !db) return;
    try {
      await deleteDoc(doc(db, "services", serviceId));
      toast({ title: "Success", description: "Service deleted successfully." });
      fetchServices(user.uid);
    } catch (error) {
      console.error("Error deleting service: ", error);
      toast({ title: "Error", description: "Could not delete service.", variant: "destructive" });
    }
  };

  const openAddDialog = () => {
    setCurrentService({});
    setIsDialogOpen(true);
  };
  
  const openEditDialog = (service: Service) => {
    setCurrentService(service);
    setIsDialogOpen(true);
  };

  const TableSkeleton = () => (
     <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Duration (min)</TableHead>
          <TableHead>Price</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...Array(3)].map((_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );


  return (
    <div>
      <PageHeader title="Services" actionButton={<Button onClick={openAddDialog} disabled={isLoading}><PlusCircle className="mr-2" />Add New Service</Button>} />
      
      <Card>
        <CardHeader>
          <CardTitle>Your Services</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <TableSkeleton /> : services.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Duration (min)</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                  {services.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell>{service.duration}</TableCell>
                      <TableCell>${Number(service.price).toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(service)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteService(service.id)} className="text-destructive">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          ) : (
             <div className="text-center py-10">
                <p className="font-semibold">No services found.</p>
                <p className="text-muted-foreground text-sm">Get started by adding your first service.</p>
                <Button onClick={openAddDialog} className="mt-4"><PlusCircle className="mr-2" /> Add Service</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentService?.id ? "Edit Service" : "Add New Service"}</DialogTitle>
            <DialogDescription>
              Fill in the details for your service below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Service Name</Label>
              <Input id="name" value={currentService?.name || ""} onChange={(e) => setCurrentService({ ...currentService, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input id="duration" type="number" value={currentService?.duration || ""} onChange={(e) => setCurrentService({ ...currentService, duration: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="price">Price ($)</Label>
                    <Input id="price" type="number" value={currentService?.price || ""} onChange={(e) => setCurrentService({ ...currentService, price: Number(e.target.value) })} />
                </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveService}>Save Service</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
