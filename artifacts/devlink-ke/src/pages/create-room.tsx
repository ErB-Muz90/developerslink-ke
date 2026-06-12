import { useCreateRoom } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { PlusSquare, Hash } from "lucide-react";

const roomSchema = z.object({
  name: z.string().min(3, "Room name must be at least 3 characters").max(50),
  description: z.string().max(500).optional(),
  type: z.enum(["discussion", "project", "learning"]),
  skills: z.string().transform(v => v.split(',').map(s => s.trim()).filter(Boolean)),
  isPrivate: z.boolean().default(false),
});

export default function CreateRoom() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<z.input<typeof roomSchema>>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "discussion",
      skills: "",
      isPrivate: false,
    }
  });

  const createRoom = useCreateRoom({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Room deployed", description: "Your space is now live." });
        setLocation(`/rooms/${data.id}`);
      },
      onError: () => {
        toast({ title: "Deployment failed", description: "Check your inputs and try again.", variant: "destructive" });
      }
    }
  });

  const onSubmit = (data: z.output<typeof roomSchema>) => {
    createRoom.mutate({
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        skills: data.skills,
        isPrivate: data.isPrivate
      }
    });
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <div className="mb-10 text-center">
        <div className="mx-auto w-16 h-16 bg-primary/10 border border-primary/30 flex items-center justify-center mb-6">
          <PlusSquare className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3 font-mono uppercase tracking-tight">
          Deploy_Room
        </h1>
        <p className="text-muted-foreground">
          Create a new focused space for discussion, collaborative projects, or shared learning.
        </p>
      </div>

      <div className="bg-card border border-border p-8 shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel className="font-mono text-xs uppercase text-foreground">Room Name</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="react-nairobi" className="pl-9 rounded-none font-mono focus-visible:ring-primary h-10 border-border" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem>
                <FormLabel className="font-mono text-xs uppercase text-foreground">Room Purpose</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="rounded-none font-mono focus-visible:ring-primary h-10 border-border">
                      <SelectValue placeholder="Select purpose" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="discussion">Discussion (General chat & networking)</SelectItem>
                    <SelectItem value="project">Project (Building something together)</SelectItem>
                    <SelectItem value="learning">Learning (Study groups & mentoring)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel className="font-mono text-xs uppercase text-foreground">Description</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="A place for React developers in Nairobi to share tips and organize meetups..." 
                    className="rounded-none font-mono focus-visible:ring-primary border-border resize-none h-24" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="skills" render={({ field }) => (
              <FormItem>
                <FormLabel className="font-mono text-xs uppercase text-foreground">Required / Relevant Skills</FormLabel>
                <FormDescription className="text-[10px] font-mono text-muted-foreground">Comma separated (e.g. React, TypeScript, GraphQL)</FormDescription>
                <FormControl>
                  <Input placeholder="React, TypeScript" className="rounded-none font-mono focus-visible:ring-primary h-10 border-border" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="pt-4 border-t border-border/50">
              <FormField control={form.control} name="isPrivate" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-none border border-border p-4 bg-muted/10">
                  <div className="space-y-1">
                    <FormLabel className="font-mono text-xs uppercase text-foreground">Private Room</FormLabel>
                    <FormDescription className="text-xs">
                      If enabled, only invited members can view contents. (Invite system WIP)
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )} />
            </div>

            <Button 
              type="submit" 
              className="w-full rounded-none font-mono text-base h-12 bg-primary text-primary-foreground hover:bg-primary/90 mt-4"
              disabled={createRoom.isPending}
            >
              {createRoom.isPending ? "DEPLOYING..." : "DEPLOY_ROOM"}
            </Button>

          </form>
        </Form>
      </div>
    </div>
  );
}
