import { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface FileNode {
    name: string;
    path: string;
    type: "file" | "folder";
    children?: FileNode[];
}

interface FileTreeProps {
    files: { path: string }[];
    onSelect: (path: string) => void;
    selectedPath?: string;
}

const buildTree = (paths: string[]): FileNode[] => {
    const root: FileNode[] = [];

    paths.forEach(path => {
        const parts = path.split('/');
        let currentLevel = root;

        parts.forEach((part, index) => {
            const isFile = index === parts.length - 1;
            // Find existing node at current level
            let existingNode = currentLevel.find(node => node.name === part);

            if (existingNode) {
                // If it's a folder, we might need to go deeper
                if (!isFile && existingNode.children) {
                    currentLevel = existingNode.children;
                }
            } else {
                // Create new node
                const newNode: FileNode = {
                    name: part,
                    path: parts.slice(0, index + 1).join('/'),
                    type: isFile ? "file" : "folder",
                    children: isFile ? undefined : []
                };
                currentLevel.push(newNode);
                if (!isFile && newNode.children) {
                    currentLevel = newNode.children;
                }
            }
        });
    });

    // Sort folders first, then files
    const sortNodes = (nodes: FileNode[]) => {
        nodes.sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === "folder" ? -1 : 1;
        });
        nodes.forEach(node => {
            if (node.children) sortNodes(node.children);
        });
    };

    sortNodes(root);
    return root;
};

const FileTreeNode = ({ node, level, onSelect, selectedPath }: { node: FileNode, level: number, onSelect: (path: string) => void, selectedPath?: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    const isSelected = node.path === selectedPath;

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (node.type === "folder") {
            setIsOpen(!isOpen);
        } else {
            onSelect(node.path);
        }
    };

    return (
        <div>
            <div 
                className={cn(
                    "flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer text-sm select-none transition-colors",
                    isSelected ? "bg-indigo-600/20 text-indigo-400" : "hover:bg-slate-800/50 text-slate-400"
                )}
                style={{ paddingLeft: `${(level * 12) + 8}px` }}
                onClick={handleClick}
            >
                {node.type === "folder" ? (
                    <>
                        {isOpen ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                        {isOpen ? <FolderOpen className="w-4 h-4 text-indigo-400 shrink-0" /> : <Folder className="w-4 h-4 text-indigo-400 shrink-0" />}
                    </>
                ) : (
                    <File className="w-4 h-4 text-slate-500 shrink-0 ml-4" />
                )}
                <span className="truncate">{node.name}</span>
            </div>
            {node.type === "folder" && isOpen && node.children && (
                <div>
                    {node.children.map(child => (
                        <FileTreeNode 
                            key={child.path} 
                            node={child} 
                            level={level + 1} 
                            onSelect={onSelect} 
                            selectedPath={selectedPath} 
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export function FileTree({ files, onSelect, selectedPath }: FileTreeProps) {
    const tree = useMemo(() => buildTree(files.map(f => f.path)), [files]);

    return (
        <ScrollArea className="h-full">
            <div className="py-2">
                {tree.map(node => (
                    <FileTreeNode 
                        key={node.path} 
                        node={node} 
                        level={0} 
                        onSelect={onSelect} 
                        selectedPath={selectedPath} 
                    />
                ))}
            </div>
        </ScrollArea>
    );
}
