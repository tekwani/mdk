import { Help, type Command, type Option } from 'commander';

/** An `Examples:` block for `addHelpText('after', ...)`. */
export function examples(...lines: string[]): string {
  return `\nExamples:\n${lines.map((line) => `  $ ${line}`).join('\n')}\n`;
}

/**
 * Help settings every command inherits, so set on the root before any subcommand
 * is added: consistent wording, and no `(default: false)` on plain flags.
 */
export function configureHelp(program: Command): Command {
  return program
    .helpOption('-h, --help', 'Show help')
    .helpCommand('help [command]', 'Show help for a command')
    .configureHelp({
      optionDescription(this: Help, option: Option): string {
        if (option.isBoolean() && option.defaultValue === false) return option.description;
        return Help.prototype.optionDescription.call(this, option);
      },
    });
}
