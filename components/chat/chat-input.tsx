"use client";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem } from "../ui/form";
import { Input } from "../ui/input";
import qs from "query-string";
import axios from "axios";
import { useModal } from "../hooks/user-model-store";
import { EmojiPicker } from "../emoji-picker";
import { useRouter } from "next/navigation";
import { Gift, Plus } from "lucide-react";

interface ChatInputProps {
  apiUrl: string;
  query: Record<string, any>;
  name: string;
  type: "conversation" | "channel";
}

const formSchema = z.object({
  content: z.string().min(1),
});

const PERSPECTIVE_API_KEY = process.env.NEXT_PUBLIC_PERSPECTIVE_API_KEY; // lưu trong .env.local

const checkToxic = async (text: string) => {
  try {
    const response = await axios.post(
      `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${PERSPECTIVE_API_KEY}`,
      {
        comment: { text },
        languages: ["en"],
        requestedAttributes: {
          TOXICITY: {},
          SPAM: {},
        },
      }
    );

    const toxicity =
      response.data.attributeScores?.TOXICITY?.summaryScore?.value || 0;
    const spam = response.data.attributeScores?.SPAM?.summaryScore?.value || 0;

    return { toxicity, spam };
  } catch (err) {
    console.error("Perspective API error:", err);
    return { toxicity: 0, spam: 0 };
  }
};

export const ChatInput = ({ apiUrl, query, name, type }: ChatInputProps) => {
  const { onOpen } = useModal();
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: "",
    },
  });

  const isLoading = form.formState.isSubmitting;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const { toxicity, spam } = await checkToxic(values.content);

      if (toxicity > 0.7) {
        alert("🚫 Tin nhắn có nội dung độc hại, không thể gửi.");
        return;
      }

      if (spam > 0.7) {
        alert("🚫 Tin nhắn bị phát hiện là spam, không thể gửi.");
        return;
      }

      const url = qs.stringifyUrl({
        url: apiUrl,
        query,
      });
      await axios.post(url, values);
      form.reset();
      router.refresh();
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="relative p-4 pb-6 w-[85%] ">
                  <button
                    type="button"
                    onClick={() => onOpen("messageFile", { apiUrl, query })}
                    className="absolute top-7 left-8 h-[24px] w-[24px] bg-zinc-500 dark:bg-zinc-400 hover:bg-zinc-600 dark:hover:bg-zinc-300 transition rounded-full p-1 flex items-center justify-center"
                  >
                    <Plus className="text-white dark:text-[#313338]" />
                  </button>
                  <Input
                    disabled={isLoading}
                    placeholder={`Text to ${
                      type === "conversation" ? name : "#" + name
                    }`}
                    {...field}
                    className="px-16 py-6 bg-zinc-200/90 dark:bg-zinc-700/75 border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-zinc-600 dark:text-zinc-200 "
                  />
                  <button 
                    type="button" 
                    className="absolute top-7 right-19" 
                    onClick={() => onOpen("payment")}
                  >
                    <Gift className="cursor-pointer text-zinc-600 dark:text-zinc-400 hover:text-indigo-500 transition" />
                  </button>
                  <div className="absolute top-7 right-8" >
                    <EmojiPicker
                      onChange={(emoji: string) =>
                        field.onChange(`${field.value} ${emoji}`)
                      }
                    />
                  </div>
                </div>
              </FormControl>
            </FormItem>
          )}
        ></FormField>
      </form>
    </Form>
  );
};

export default ChatInput;
